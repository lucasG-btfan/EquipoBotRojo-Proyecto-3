#windows-servers
!228 ar.conf
restart-ossec0 - restart-ossec.sh - 0
restart-ossec0 - restart-ossec.cmd - 0
restart-wazuh0 - restart-ossec.sh - 0
restart-wazuh0 - restart-ossec.cmd - 0
restart-wazuh0 - restart-wazuh - 0
restart-wazuh0 - restart-wazuh.exe - 0
!867 agent.conf
<agent_config os="windows">
  <!-- Configuración específica para servidores Windows -->
  <syscheck>
    <directories check_all="yes">C:\windows\system32</directories>
    <directories check_all="yes">C:\Program Files</directories>
    <directories check_all="yes">C:\Program Files (x86)</directories>
  </syscheck>

  <rootcheck>
    <rootkit_files>/var/ossec/etc/shared/rootkit_files.txt</rootkit_files>
    <rootkit_trojans>/var/ossec/etc/shared/rootkit_trojans.txt</rootkit_trojans>
  </rootcheck>

  <localfile>
    <log_format>eventchannel</log_format>
    <location>Security</location>
  </localfile>

  <localfile>
    <log_format>eventchannel</log_format>
    <location>Application</location>
  </localfile>

  <localfile>
    <log_format>eventchannel</log_format>
    <location>System</location>
  </localfile>
</agent_config>
