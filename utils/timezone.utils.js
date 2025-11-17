const { DateTime } = require('luxon');

// 1. DB에서 가져온 데이터 (가정)
const utcTimeFromDB = '2025-11-16T00:00:00Z';
const userTimezone = 'Asia/Seoul';

// 2. 라이브러리로 시간 객체 생성
const utcDateTime = DateTime.fromISO(utcTimeFromDB);

// 3. 사용자의 시간대로 변환 (이게 핵심!)
const localDateTime = utcDateTime.setZone(userTimezone);

// 4. 결과
console.log(localDateTime.toString());
// 출력: "2025-11-16T09:00:00.000+09:00"
