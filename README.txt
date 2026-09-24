사진품질판정원 MOBILE · GitHub Pages v1.4

핵심 기능
- 휴대폰/컴퓨터 로컬 사진 다중 선택
- Google Drive 로그인 → Drive 검색 → 이미지 다중 선택 → 판정원으로 불러오기
- GO / HOLD / DROP 판정
- 마지막 사진 판정 시 자동 결과 화면
- 결과 모아보기 / CSV 판정표 저장
- 선택 폴더에 GO / HOLD / DROP 복사 정리(지원 브라우저)
- PWA 앱 설치 버튼

Google Drive 연동
- Google Picker API + Google Drive API 사용
- OAuth 범위: drive.file
- 사용자가 Picker에서 직접 선택한 파일만 읽음
- Google 로그인/Drive 파일 요청은 Service Worker 캐시에 저장하지 않음
- OAuth 앱이 '테스트' 상태라면 Google Auth Platform의 테스트 사용자로 등록된 계정만 로그인 가능

배포
1. GitHub 저장소 루트의 index.html, sw.js, README.txt를 이번 버전으로 덮어쓰기
2. main / (root) GitHub Pages 설정 유지
3. 배포 주소: https://koreasambo.github.io/photo-judge-mobile/
4. 캐시 때문에 구버전이 보이면 브라우저 새로고침 또는 앱을 완전히 종료 후 다시 실행
