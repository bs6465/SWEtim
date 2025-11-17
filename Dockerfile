# 1. 베이스 이미지 선택
# 가볍고 안정적인 node 24 alpine 버전을 사용합니다.
FROM node:24-slim

LABEL name="bs6465"
LABEL description="swetim"

# 2. 작업 디렉터리 설정
# 컨테이너 내에서 앱 코드가 위치할 디렉터리를 설정합니다.
WORKDIR /usr/src/app

# 3. 의존성 설치 (캐시 활용)
# package.json과 package-lock.json을 먼저 복사합니다.
# 이렇게 하면 소스 코드가 변경되어도 npm install을 다시 실행하지 않아 빌드 속도가 빨라집니다.
COPY package*.json ./

# 4. 프로덕션용 의존성만 설치
# devDependencies를 제외하고 설치하여 이미지 용량을 줄입니다.
# npm ci = package.json 에서 패키지 버전에 맞춰서 설치 = 개발환경과 항상 패키지 버전이 같음 (업데이트하면 그대로 반영)
RUN npm ci --only=production

# 5. 소스 코드 복사
# 나머지 모든 소스 코드를 작업 디렉터리로 복사합니다.
COPY . .

# 6. 애플리케이션 포트 노출
# 앱이 사용하는 포트를 노출합니다. (예: 3000, 8080 등)
# 실제 서비스 포트에 맞게 수정하세요.
EXPOSE 3000

# 7. 컨테이너 실행 명령어
# 컨테이너가 시작될 때 실행할 명령어입니다.
# 'npm start'를 사용한다면 ["npm", "start"]로 변경하세요.
CMD ["node", "index.js"]