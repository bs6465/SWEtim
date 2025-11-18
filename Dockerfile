# 베이스 이미지 선택
FROM node:24-slim

LABEL name="bs6465"
LABEL description="swetim"

# 작업 디렉터리 설정
WORKDIR /usr/src/app

# 의존성 설치 (캐시 활용)
COPY package*.json ./

# 프로덕션용 의존성만 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 애플리케이션 포트 노출
EXPOSE 3000

# 컨테이너 실행 명령어
CMD ["node", "index.js"]