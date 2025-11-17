# 1단계: "builder" - 빌드 및 모든 의존성 설치
# (Alpine은 C++ 빌드 등이 필요할 때 복잡할 수 있어, 
#  빌드는 -slim 버전을 쓰는 것도 좋습니다.)
FROM node:24-slim AS builder

WORKDIR /usr/src/app

# 의존성 설치 (프로덕션용 + 개발용 모두 설치)
COPY package*.json ./
RUN npm ci

# 소스 코드 복사 (TypeScript 빌드 등이 필요하면 여기서 RUN npm run build)
COPY . .

# TypeScript 등을 JavaScript로 빌드
RUN npm run build

# -----------------------------------------------

# 2단계: "final" - 실제 배포용 (초경량)
FROM node:24-alpine
WORKDIR /usr/src/app

# 프로덕션용 의존성만 깔끔하게 설치
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# 6. 애플리케이션 포트 노출
EXPOSE 3000

# 7. 컨테이너 실행 명령어
# 컨테이너가 시작될 때 실행할 명령어입니다.
# 'npm start'를 사용한다면 ["npm", "start"]로 변경하세요.
CMD ["node", "dist/index.js"]