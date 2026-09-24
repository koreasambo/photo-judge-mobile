사진품질판정원 MOBILE · GitHub Pages v1.7

Google Drive 폴더 선택 → 앱 내부 썸네일 → 전체선택/전체해제 → 일괄 불러오기 지원.

사진품질판정원 MOBILE v1.6

- v1.5 Google Drive 모바일 OAuth/Picker 개선 유지
- v1.6 서비스워커 강제 업데이트 및 캐시 고착 방지
- 페이지 이동은 network-first로 최신 GitHub Pages 배포본 우선
- Google 외부 요청은 캐시하지 않음

사진품질판정원 MOBILE · GitHub Pages v1.5

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

v1.5 모바일 Drive 수정
- Google API/GIS 라이브러리를 페이지 로드 직후 미리 준비
- 모바일 브라우저에서 Drive 버튼 클릭 즉시 OAuth 토큰 요청
- 비동기 로딩 때문에 사용자 클릭 권한이 끊겨 로그인 팝업이 막히던 문제 수정
