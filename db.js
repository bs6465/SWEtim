// dotenv를 사용하여 .env 파일의 환경 변수를 로드합니다.
const { Pool } = require('pg');

// 데이터베이스 연결을 위한 Pool 객체 생성
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // SSL 연결을 비활성화합니다.
  ssl: false,

  /* // 또는 더 명시적으로:
  ssl: {
    rejectUnauthorized: false
    // 참고: 이 옵션은 SSL을 사용하되, 
    // 인증서가 유효한지(self-signed 등) 검사하지 않겠다는 의미입니다.
    // '서버가 SSL을 지원하지 않는 경우'의 해결책은 단순히 ssl: false 입니다.
  }
  */
});

// 다른 파일에서 Pool을 사용할 수 있도록 export
module.exports = pool;
