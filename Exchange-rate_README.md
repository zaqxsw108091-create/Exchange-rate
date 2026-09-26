# 오늘의 진짜 정보판 — USD/KRW 환율

매일 달러/원 환율을 기록·비교하고, 외부 API가 실패했을 때 그 상태를 화면에 그대로 보여주는 정보판 (SKT 알레프 과제 4)
🔗 https://zaqxsw108091-create.github.io/Exchange-rate/

- **내가 정한 것**: 데이터로 USD/KRW 환율을, 원천으로 키가 필요 없는 Frankfurter API를 선택. 과제 조건인 '서울 시간 기준 하루 한 줄 기록'과 '실패 5가지(느림·접근 거부·호출 제한·오프라인·형식 변경) 표시'를 이 데이터로 채우기로 함.
- **AI가 짠 것**: 화면(index.html·app.js), 재시도 로직(1초→2초→4초), 기록 저장 스크립트, 테스트 코드(test-suite.js).
- **내가 고친 것**: 배포된 화면이 옛 API 주소(frankfurter.app)로 실패하던 것을 app.js에서 frankfurter.dev로 교체. 폴더를 잘못 선택해 생긴 `data/data` 중복 폴더를 정리하고, 두 컴퓨터에서 작업하다 난 충돌은 날짜 기록을 직접 합쳐 해결.
