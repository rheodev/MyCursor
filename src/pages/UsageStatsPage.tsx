import { useState, useEffect, useCallback } from "react";
import { Card, Button, Icon } from "../components";
import { UsageDisplay } from "../components";
import { AccountService } from "../services/accountService";
import type { AccountInfo } from "../types/account";
import { performanceMonitor } from "../utils/performance";

const UsageStatsPage = () => {
  const [token, setToken] = useState("");
  const [currentAccount, setCurrentAccount] = useState<AccountInfo | null>(
    null
  );
  const [_loading, setLoading] = useState(false);

  // 加载当前账户
  const loadCurrentAccount = useCallback(async () => {
    performanceMonitor.start('UsageStatsPage_loadCurrentAccount');
    setLoading(true);
    try {
      const result = await AccountService.getAccountList();
      if (result.success && result.current_account) {
        setCurrentAccount(result.current_account);
        setToken(result.current_account.token);
      }
    } catch (error) {
      console.error("Failed to load current account:", error);
    } finally {
      setLoading(false);
      const duration = performanceMonitor.end('UsageStatsPage_loadCurrentAccount');
      console.log(`✅ 当前账户加载完成，耗时: ${duration.toFixed(2)}ms`);
    }
  }, []);

  // 组件挂载时加载
  useEffect(() => {
    loadCurrentAccount();
  }, [loadCurrentAccount]);

  return (
    <div className="space-y-6">
      {/* 用量展示组件 */}
      {token ? (
        <UsageDisplay
          token={token}
          email={currentAccount?.email}
          className="animate-fadeIn"
        />
      ) : (
        <Card className="p-12 text-center">
          <div className="mb-4 flex justify-center">
            <Icon name="chart" size={64} color="var(--text-secondary)" />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>暂无数据</h3>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>请先在账号管理页面登录账户</p>
          <Button variant="primary" onClick={loadCurrentAccount}>
            加载当前账户
          </Button>
        </Card>
      )}
    </div>
  );
};

export default UsageStatsPage;
