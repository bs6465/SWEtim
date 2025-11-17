const bcrypt = require('bcrypt');
const saltRounds = 10; // 해시 연산 횟수

/**
 * 1. 비밀번호를 해시화하는 함수 (회원가입 시 사용)
 * @param {string} plainPassword - 사용자가 입력한 원본 비밀번호
 * @returns {Promise<string>} - 해시된 비밀번호
 */
async function hashPassword(plainPassword) {
  try {
    const hash = await bcrypt.hash(plainPassword, saltRounds);
    return hash;
  } catch (err) {
    console.error('Hashing error:', err);
    // 실제 프로덕션에서는 더 정교한 에러 처리가 필요할 수 있습니다.
    throw new Error('Error hashing password');
  }
}

/**
 * 2. 원본 비밀번호와 해시된 비밀번호를 비교하는 함수 (로그인 시 사용)
 * @param {string} plainPassword - 사용자가 (로그인 시) 입력한 원본 비밀번호
 * @param {string} hashedPassword - DB에 저장된 해시된 비밀번호
 * @returns {Promise<boolean>} - 일치하면 true, 아니면 false
 */
async function comparePassword(plainPassword, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (err) {
    console.error('Comparison error:', err);
    return false; // 비교 중 에러가 발생해도 false를 반환하는 것이 안전합니다.
  }
}

// 두 함수를 모듈로 내보냅니다.
module.exports = {
  hashPassword,
  comparePassword,
};
