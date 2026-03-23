/// 账号管理服务
///
/// 负责账号 CRUD、切换、导入导出、订阅刷新等全部账号相关业务逻辑。
/// 所有 IO 操作委托给 infra 层（CursorBridge + AccountStore）。
use crate::domain::account::*;
use crate::domain::identity::MachineIds;
use crate::error::AppError;
use crate::infra::cursor::CursorBridge;
use crate::infra::store::AccountStore;
use crate::{log_info, log_error, log_debug};
use std::path::PathBuf;

/// 账号管理服务
pub struct AccountService {
    cursor: CursorBridge,
    store: AccountStore,
}

impl AccountService {
    pub fn new(cursor: CursorBridge, store: AccountStore) -> Self {
        Self { cursor, store }
    }

    // === 列表 ===

    /// 获取完整账号列表（合并本地缓存与 Cursor 当前账号）
    pub fn list_all(&self) -> Result<AccountListResult, AppError> {
        let mut accounts = self.store.load_all()?;
        let current = self.read_current_from_cursor()?;

        if let Some(ref cur) = current {
            self.merge_current(&mut accounts, cur);
        }

        Ok(AccountListResult {
            success: true,
            accounts,
            current_account: current,
            message: "账号列表获取成功".to_string(),
        })
    }

    /// 获取当前 Cursor 账号
    pub fn get_current(&self) -> Result<Option<AccountInfo>, AppError> {
        self.read_current_from_cursor()
    }

    // === 增删改 ===

    /// 添加或更新账号（邮箱已存在时更新 token/机器码等字段）
    pub fn add(&self, account: AccountInfo) -> Result<(), AppError> {
        let mut accounts = self.store.load_all()?;

        if let Some(existing) = accounts.iter_mut().find(|a| a.email == account.email) {
            existing.token = account.token;
            if account.refresh_token.is_some() {
                existing.refresh_token = account.refresh_token;
            }
            if account.workos_cursor_session_token.is_some() {
                existing.workos_cursor_session_token = account.workos_cursor_session_token;
            }
            if account.machine_ids.is_some() {
                existing.machine_ids = account.machine_ids;
            }
            if !account.tags.is_empty() {
                existing.tags = account.tags;
            }
            if account.username.is_some() {
                existing.username = account.username;
            }
        } else {
            accounts.push(account);
        }

        self.store.save_all(&accounts)?;
        Ok(())
    }

    /// 编辑账号
    pub fn edit(&self, email: &str, updates: AccountInfo) -> Result<(), AppError> {
        let mut accounts = self.store.load_all()?;

        if let Some(acc) = accounts.iter_mut().find(|a| a.email == email) {
            *acc = updates;
            self.store.save_all(&accounts)?;
            Ok(())
        } else {
            Err(AppError::AccountNotFound(email.to_string()))
        }
    }

    /// 删除账号
    pub fn remove(&self, email: &str) -> Result<(), AppError> {
        let mut accounts = self.store.load_all()?;
        let len_before = accounts.len();
        accounts.retain(|a| a.email != email);

        if accounts.len() == len_before {
            return Err(AppError::AccountNotFound(email.to_string()));
        }

        self.store.save_all(&accounts)?;
        Ok(())
    }

    // === 切换 ===

    /// 切换账号（注入 token/email 到 Cursor 存储）
    pub fn switch(&self, email: &str) -> Result<SwitchAccountResult, AppError> {
        let accounts = self.store.load_all()?;
        let account = accounts.iter().find(|a| a.email == email)
            .ok_or_else(|| AppError::AccountNotFound(email.to_string()))?;

        let mut details = Vec::new();

        // 注入认证信息到 storage.json
        let token = Self::extract_token_part(&account.token);
        match self.cursor.storage().write_auth(&account.email, &token) {
            Ok(_) => details.push("已更新 storage.json 认证信息".to_string()),
            Err(e) => details.push(format!("更新 storage.json 失败: {}", e)),
        }

        // 注入到 SQLite
        match self.cursor.sqlite().inject_email(&account.email) {
            Ok(_) => details.push("已注入邮箱到 SQLite".to_string()),
            Err(e) => details.push(format!("注入邮箱失败: {}", e)),
        }
        match self.cursor.sqlite().inject_token(&token) {
            Ok(_) => details.push("已注入 Token 到 SQLite".to_string()),
            Err(e) => details.push(format!("注入 Token 失败: {}", e)),
        }

        // 更新 is_current 标记
        let mut all_accounts = self.store.load_all()?;
        for acc in all_accounts.iter_mut() {
            acc.is_current = acc.email == email;
        }
        self.store.save_all(&all_accounts)?;

        log_info!("账号已切换至: {}", email);

        Ok(SwitchAccountResult {
            success: true,
            message: format!("已切换至 {}", email),
            details,
        })
    }

    // === 导入导出 ===

    /// 导出账号到指定目录
    ///
    /// 自动生成文件名：单个账号用邮箱命名，多个用批量+时间戳命名。
    pub fn export(&self, export_dir: &str, selected_emails: Option<Vec<String>>) -> Result<serde_json::Value, AppError> {
        let accounts = self.store.load_all()?;

        let to_export: Vec<_> = if let Some(ref emails) = selected_emails {
            if emails.is_empty() {
                accounts
            } else {
                accounts.into_iter().filter(|a| emails.contains(&a.email)).collect()
            }
        } else {
            accounts
        };

        if to_export.is_empty() {
            return Ok(serde_json::json!({
                "success": false,
                "message": "没有可导出的账号"
            }));
        }

        let filename = if to_export.len() == 1 {
            let sanitized = to_export[0].email.replace(['@', '.', '/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
            format!("{}_cursor_accounts.json", sanitized)
        } else {
            let now = chrono::Local::now().format("%Y%m%d_%H%M%S");
            format!("cursor_accounts_batch_{}.json", now)
        };

        let file_path = std::path::PathBuf::from(export_dir).join(&filename);
        let content = serde_json::to_string_pretty(&to_export)?;
        std::fs::write(&file_path, &content)?;

        let path_str = file_path.to_string_lossy().to_string();
        log_info!("导出 {} 个账号到 {}", to_export.len(), path_str);

        Ok(serde_json::json!({
            "success": true,
            "message": format!("成功导出 {} 个账号", to_export.len()),
            "count": to_export.len(),
            "exported_path": path_str
        }))
    }

    /// 从文件导入账号（已存在的账号用导入数据覆盖）
    pub fn import(&self, import_path: &str) -> Result<serde_json::Value, AppError> {
        let content = std::fs::read_to_string(import_path)?;
        let imported: Vec<AccountInfo> = serde_json::from_str(&content)?;
        let import_count = imported.len();

        let mut accounts = self.store.load_all()?;

        let mut added = 0;
        let mut updated = 0;

        for new_acc in imported {
            if let Some(existing) = accounts.iter_mut().find(|a| a.email == new_acc.email) {
                *existing = new_acc;
                updated += 1;
            } else {
                accounts.push(new_acc);
                added += 1;
            }
        }

        self.store.save_all(&accounts)?;

        log_info!("导入完成: 新增 {}, 更新 {}, 共 {}", added, updated, import_count);

        Ok(serde_json::json!({
            "success": true,
            "message": format!("导入完成: 新增 {} 个, 更新 {} 个已存在", added, updated),
            "added": added,
            "updated": updated,
            "total": import_count
        }))
    }

    // === 登出 ===

    /// 登出当前账号（清除认证数据）
    pub fn logout(&self) -> Result<LogoutResult, AppError> {
        let mut details = Vec::new();

        match self.cursor.sqlite().clear_auth_data() {
            Ok(_) => details.push("已清除 SQLite 认证数据".to_string()),
            Err(e) => details.push(format!("清除 SQLite 失败: {}", e)),
        }

        match self.cursor.storage().clear_auth_data() {
            Ok(_) => details.push("已清除 storage.json 认证数据".to_string()),
            Err(e) => details.push(format!("清除 storage.json 失败: {}", e)),
        }

        log_info!("已登出当前账号");

        Ok(LogoutResult {
            success: true,
            message: "已登出".to_string(),
            details,
        })
    }

    // === 内部方法 ===

    /// 从 Cursor 本地文件读取当前账号
    fn read_current_from_cursor(&self) -> Result<Option<AccountInfo>, AppError> {
        let email = self.cursor.storage().read_email()?;
        let token = self.cursor.storage().read_token()?;

        match (email, token) {
            (Some(email), Some(token)) => {
                let saved = self.store.load_all().unwrap_or_default();
                if let Some(existing) = saved.iter().find(|a| a.email == email) {
                    Ok(Some(AccountInfo {
                        is_current: true,
                        token,
                        ..existing.clone()
                    }))
                } else {
                    let current_ids = self.cursor.read_full_machine_ids().ok();
                    Ok(Some(AccountInfo {
                        email,
                        token,
                        refresh_token: None,
                        workos_cursor_session_token: None,
                        is_current: true,
                        created_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                        username: None,
                        tags: Vec::new(),
                        machine_ids: current_ids,
                        subscription_type: None,
                        subscription_status: None,
                        trial_days_remaining: None,
                        name: None,
                        sub: None,
                        picture: None,
                        user_id: None,
                    }))
                }
            }
            _ => Ok(None),
        }
    }

    /// 将当前账号合并到列表中
    fn merge_current(&self, accounts: &mut Vec<AccountInfo>, current: &AccountInfo) {
        for acc in accounts.iter_mut() {
            acc.is_current = acc.email == current.email;
        }

        if !accounts.iter().any(|a| a.email == current.email) {
            accounts.insert(0, current.clone());
        }
    }

    /// 提取 token 的实际部分（去除前缀）
    fn extract_token_part(raw: &str) -> String {
        let decoded = raw.replace("%3A%3A", "::").replace("%3a%3a", "::");
        if decoded.contains("::") {
            decoded.split("::").last().unwrap_or(&decoded).trim().to_string()
        } else {
            decoded.trim().to_string()
        }
    }

    /// 获取账号存储引用
    pub fn store(&self) -> &AccountStore {
        &self.store
    }

    /// 获取 CursorBridge 引用
    pub fn cursor(&self) -> &CursorBridge {
        &self.cursor
    }
}
