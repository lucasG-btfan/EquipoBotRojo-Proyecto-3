#test-group-2
!228 ar.conf
restart-ossec0 - restart-ossec.sh - 0
restart-ossec0 - restart-ossec.cmd - 0
restart-wazuh0 - restart-ossec.sh - 0
restart-wazuh0 - restart-ossec.cmd - 0
restart-wazuh0 - restart-wazuh - 0
restart-wazuh0 - restart-wazuh.exe - 0
!207 agent.conf
<agent_config>
  <!-- Configuración genérica para pruebas -->
  <syscheck>
    <directories check_all="yes">/etc,/usr/bin</directories>
    <frequency>7200</frequency>
  </syscheck>
</agent_config>
