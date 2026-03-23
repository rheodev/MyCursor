fn main() {
    #[cfg(target_os = "windows")]
    {
        let mut windows = tauri_build::WindowsAttributes::new();
        windows = windows.app_manifest(r#"
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false" />
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>
"#);
        tauri_build::try_build(
            tauri_build::Attributes::new().windows_attributes(windows),
        )
        .expect("构建失败");
    }

    #[cfg(not(target_os = "windows"))]
    {
        tauri_build::build();
    }
}

