#linux-servers
!228 ar.conf
restart-ossec0 - restart-ossec.sh - 0
restart-ossec0 - restart-ossec.cmd - 0
restart-wazuh0 - restart-ossec.sh - 0
restart-wazuh0 - restart-ossec.cmd - 0
restart-wazuh0 - restart-wazuh - 0
restart-wazuh0 - restart-wazuh.exe - 0
!791 agent.conf
<agent_config>
  <!-- Configuración específica para servidores Linux -->
  <syscheck>
    <directories check_all="yes">/etc,/usr/bin,/usr/sbin,/bin,/sbin</directories>
    <directories check_all="yes">/home/*/.ssh</directories>
    <ignore>/etc/mtab</ignore>
    <ignore>/etc/hosts.deny</ignore>
    <ignore>/etc/.pwd.lock</ignore>
  </syscheck>

  <rootcheck>
    <rootkit_files>/var/ossec/etc/shared/rootkit_files.txt</rootkit_files>
    <rootkit_trojans>/var/ossec/etc/shared/rootkit_trojans.txt</rootkit_trojans>
  </rootcheck>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>
</agent_config>
