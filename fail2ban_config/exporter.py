import time, sqlite3, os
from prometheus_client import start_http_server, Gauge

F2B_UP = Gauge("fail2ban_up", "Estado del exportador")
F2B_BANNED = Gauge("fail2ban_banned_ips", "IPs actualmente baneadas", ["jail"])

DB_PATH = "/data/db/fail2ban.sqlite3"
PID_PATH = "/var/run/fail2ban/fail2ban.pid"

def is_fail2ban_running():
    return os.path.exists(PID_PATH)

def update_metrics():
    if not is_fail2ban_running():
        print("Fail2ban caído - PID file no encontrado")
        F2B_UP.set(0)
        F2B_BANNED.labels(jail='n8n-soar-jail').set(0)
        return
    
    if not os.path.exists(DB_PATH):
        print("BD no encontrada")
        F2B_UP.set(0)
        return
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA query_only = ON")
        cursor = conn.cursor()
        now = int(time.time())
        cursor.execute(f"SELECT jail, COUNT(*) FROM bans WHERE (timeofban + bantime) > {now} GROUP BY jail")
        results = cursor.fetchall()
        
        jails_activas = set()
        for jail, count in results:
            F2B_BANNED.labels(jail=jail).set(count)
            print(f"Jail {jail}: {count} baneados")
            jails_activas.add(jail)
        if 'n8n-soar-jail' not in jails_activas:
            F2B_BANNED.labels(jail='n8n-soar-jail').set(0)
        F2B_UP.set(1)
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
        F2B_UP.set(0)

if __name__ == "__main__":
    start_http_server(9121)
    print("Exportador por Base de Datos iniciado")
    while True:
        update_metrics()
        time.sleep(15)