#!/bin/sh
echo "=== nc? ==="
which nc netcat ncat 2>/dev/null || echo "no nc"
ls /usr/bin/nc* /bin/nc* 2>/dev/null || echo "no nc binary"
echo ""
echo "=== logger? ==="
which logger 2>/dev/null || echo "no logger"
echo ""
echo "=== python3? ==="
which python3 2>/dev/null || echo "no python3"
echo ""
echo "=== node dgram? ==="
node -e "console.log('node:', process.version); var d=require('dgram'); console.log('dgram:', typeof d.createSocket);"
echo ""
echo "=== busybox? ==="
busybox 2>&1 | head -3
echo ""
echo "=== wget version ==="
wget --version 2>&1 | head -1
