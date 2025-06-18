#!/bin/bash

echo "🚀 연결이(Yeongyul) 데모 실행 옵션"
echo "================================="
echo ""
echo "1. 웹 브라우저에서 보기 (가장 시각적)"
echo "   실행: node start-demo-server.js"
echo "   접속: http://localhost:8080"
echo ""
echo "2. 터미널에서 인터랙티브 데모"
echo "   실행: node demo-terminal.js"
echo ""
echo "3. 자동 시연 (방금 본 것)"
echo "   실행: node visual-demo.js"
echo ""
echo "어떤 것을 실행하시겠습니까? (1/2/3): "
read choice

case $choice in
  1)
    echo "웹 데모 서버를 시작합니다..."
    node start-demo-server.js
    ;;
  2)
    echo "터미널 인터랙티브 데모를 시작합니다..."
    node demo-terminal.js
    ;;
  3)
    echo "자동 시연을 시작합니다..."
    node visual-demo.js
    ;;
  *)
    echo "잘못된 선택입니다."
    ;;
esac