사진품질판정원 MOBILE · GitHub Pages v1

구성
- index.html : 메인 앱
- assets/GO.png, HOLD.png, DROP.png : 확정 캐릭터 에셋
- manifest.webmanifest : 홈 화면 설치용
- sw.js : 앱 셸 오프라인 캐시

GitHub Pages 올리는 법
1. GitHub에서 새 Public repository 생성
2. 이 폴더 안의 파일/폴더를 저장소 최상단(root)에 업로드
3. Settings > Pages
4. Build and deployment에서 Deploy from a branch
5. Branch: main / /(root) 선택 후 Save
6. 표시되는 https://아이디.github.io/저장소이름/ 주소를 휴대폰 Chrome에서 열기
7. Chrome 메뉴 > 홈 화면에 추가(또는 앱 설치)

주의
- 사진 파일 자체는 이 웹페이지 서버로 업로드하지 않습니다. 브라우저가 선택한 로컬 사진을 읽습니다.
- 판정 이력은 브라우저 localStorage에 저장됩니다. 브라우저 데이터 삭제 시 기록이 사라질 수 있으므로 CSV Export를 병행하세요.
- 폴더 직접 저장 기능은 브라우저 지원 여부에 따라 달라집니다.
