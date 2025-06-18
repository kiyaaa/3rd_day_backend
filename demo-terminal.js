const readline = require('readline');
const axios = require('axios');

const API_URL = 'http://localhost:3004/api';

// ANSI 색상 코드
const c = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m'
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 유틸리티 함수
const clear = () => console.clear();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function printHeader() {
    clear();
    console.log(`${c.bgBlue}${c.bright}${'='.repeat(60)}${c.reset}`);
    console.log(`${c.bgBlue}${c.bright}  🚀 연결이(Yeongyul) 인터랙티브 데모  ${c.reset}`);
    console.log(`${c.bgBlue}${c.bright}${'='.repeat(60)}${c.reset}\n`);
}

function printMenu() {
    console.log(`${c.cyan}메뉴를 선택하세요:${c.reset}\n`);
    console.log(`  ${c.yellow}1.${c.reset} 시나리오 보기 (전체 흐름 확인)`);
    console.log(`  ${c.yellow}2.${c.reset} 단계별 진행 (직접 클릭하며 진행)`);
    console.log(`  ${c.yellow}3.${c.reset} 채팅 시뮬레이션 (실시간 대화 보기)`);
    console.log(`  ${c.yellow}4.${c.reset} API 테스트 (직접 API 호출)`);
    console.log(`  ${c.yellow}0.${c.reset} 종료\n`);
}

async function showScenario() {
    printHeader();
    console.log(`${c.green}📖 전체 시나리오${c.reset}\n`);
    
    const steps = [
        { icon: '👥', title: '사용자 등록', desc: 'Alex(질문자), Sarah와 Mike(전문가) 계정 생성' },
        { icon: '🔐', title: '로그인', desc: '모든 사용자가 로그인하여 JWT 토큰 획득' },
        { icon: '📝', title: '질문 등록', desc: 'Alex가 "React useEffect 무한 루프" 문제 등록' },
        { icon: '🤖', title: 'AI 매칭', desc: 'RAG 시스템이 Sarah와 Mike를 전문가로 매칭' },
        { icon: '💬', title: '채팅방 생성', desc: '매칭된 전문가들과 채팅방 생성' },
        { icon: '🗨️', title: '실시간 대화', desc: '3명이 실시간으로 문제 해결' },
        { icon: '✅', title: '문제 해결', desc: '해결책 제시 및 채팅 종료' }
    ];
    
    for (const [i, step] of steps.entries()) {
        console.log(`${c.bright}${step.icon} Step ${i + 1}: ${step.title}${c.reset}`);
        console.log(`   ${step.desc}\n`);
        await delay(1000);
    }
    
    console.log(`${c.green}✨ 약 5분 만에 문제 해결 완료!${c.reset}\n`);
    
    await waitForEnter();
}

async function stepByStep() {
    let step = 1;
    let tokens = {};
    
    while (true) {
        printHeader();
        console.log(`${c.cyan}단계별 진행 - Step ${step}${c.reset}\n`);
        
        switch(step) {
            case 1:
                console.log(`${c.yellow}👥 Step 1: 사용자 등록${c.reset}\n`);
                console.log('다음 사용자들을 등록합니다:');
                console.log('• Alex Kim (질문자)');
                console.log('• Sarah Lee (React 전문가)');
                console.log('• Mike Park (성능 최적화 전문가)\n');
                
                if (await confirm('사용자를 등록하시겠습니까?')) {
                    console.log('\n등록 중...');
                    // 실제 API 호출 시뮬레이션
                    await delay(1500);
                    console.log(`${c.green}✓ 모든 사용자 등록 완료!${c.reset}`);
                }
                break;
                
            case 2:
                console.log(`${c.yellow}🔐 Step 2: 로그인${c.reset}\n`);
                console.log('등록된 사용자들이 로그인합니다.\n');
                
                if (await confirm('로그인을 진행하시겠습니까?')) {
                    console.log('\n로그인 중...');
                    await delay(1500);
                    console.log(`${c.green}✓ 모든 사용자 로그인 성공!${c.reset}`);
                    console.log('JWT 토큰이 발급되었습니다.');
                }
                break;
                
            case 3:
                console.log(`${c.yellow}📝 Step 3: 질문 등록${c.reset}\n`);
                console.log('Alex가 다음 질문을 등록합니다:\n');
                console.log(`${c.bgGreen}${c.bright} 제목: React useEffect 무한 루프 문제 ${c.reset}`);
                console.log('내용: useEffect 안에서 state를 업데이트하면');
                console.log('      무한 루프가 발생합니다. 어떻게 해결해야 하나요?\n');
                
                if (await confirm('질문을 등록하시겠습니까?')) {
                    console.log('\n질문 등록 중...');
                    await delay(1500);
                    console.log(`${c.green}✓ 질문이 등록되었습니다! (ID: 1)${c.reset}`);
                }
                break;
                
            case 4:
                console.log(`${c.yellow}🤖 Step 4: AI 전문가 매칭${c.reset}\n`);
                console.log('AI가 질문을 분석하여 전문가를 찾습니다...\n');
                
                if (await confirm('AI 매칭을 시작하시겠습니까?')) {
                    console.log('\n분석 중...');
                    await delay(1000);
                    console.log('• 키워드 추출: useEffect, state, 무한 루프');
                    await delay(1000);
                    console.log('• 필요 전문성: React Hooks, 상태 관리');
                    await delay(1000);
                    console.log(`${c.green}✓ Sarah Lee (React 전문가) 매칭!${c.reset}`);
                    console.log(`${c.green}✓ Mike Park (최적화 전문가) 매칭!${c.reset}`);
                }
                break;
                
            case 5:
                console.log(`${c.yellow}💬 Step 5: 채팅방 생성 및 대화${c.reset}\n`);
                console.log('매칭된 전문가들과 실시간 채팅방이 생성됩니다.\n');
                
                if (await confirm('채팅 내용을 보시겠습니까?')) {
                    await showChatSimulation();
                }
                console.log(`\n${c.green}✅ 문제가 해결되었습니다!${c.reset}`);
                break;
                
            default:
                console.log(`${c.green}🎉 데모가 완료되었습니다!${c.reset}\n`);
                await waitForEnter();
                return;
        }
        
        console.log('\n');
        const choice = await question(`다음 단계로 진행하려면 Enter, 메뉴로 돌아가려면 'q': `);
        if (choice.toLowerCase() === 'q') return;
        step++;
    }
}

async function showChatSimulation() {
    console.log(`\n${c.bgBlue}${c.bright} 💬 실시간 채팅 ${c.reset}\n`);
    
    const messages = [
        { user: 'Alex', msg: '안녕하세요! useEffect 무한 루프 문제로 도움이 필요합니다.', delay: 2000 },
        { user: 'Sarah', msg: '안녕하세요 Alex님! 코드를 보여주실 수 있나요?', delay: 2500 },
        { user: 'Alex', msg: 'useEffect(() => { setCount(count + 1); }, [count]);', delay: 2000 },
        { user: 'Sarah', msg: '문제를 찾았습니다! dependency array에 count가 있어서 무한 루프가 발생하네요.', delay: 3000 },
        { user: 'Mike', msg: 'count가 변경될 때마다 useEffect가 실행되고, 또 count를 변경하니 무한 반복이죠.', delay: 2500 },
        { user: 'Sarah', msg: '해결: 1) 빈 배열 사용 [], 2) 함수형 업데이트 setCount(prev => prev + 1)', delay: 3000 },
        { user: 'Alex', msg: '아하! 이해했습니다. 감사합니다! 👍', delay: 2000 }
    ];
    
    for (const msg of messages) {
        const time = new Date().toLocaleTimeString('ko-KR');
        const color = msg.user === 'Alex' ? c.green : msg.user === 'Sarah' ? c.blue : c.magenta;
        console.log(`${color}[${time}] ${msg.user}:${c.reset} ${msg.msg}`);
        await delay(msg.delay);
    }
}

async function apiTest() {
    printHeader();
    console.log(`${c.cyan}API 테스트${c.reset}\n`);
    
    console.log('테스트할 API를 선택하세요:\n');
    console.log('1. 서버 상태 확인 (GET /health)');
    console.log('2. 질문 목록 조회 (GET /api/questions)');
    console.log('3. 사용자 등록 (POST /api/auth/register)');
    console.log('4. 로그인 (POST /api/auth/login)\n');
    
    const choice = await question('선택: ');
    
    try {
        let response;
        console.log('\nAPI 호출 중...\n');
        
        switch(choice) {
            case '1':
                response = await axios.get('http://localhost:3004/health');
                break;
            case '2':
                response = await axios.get(`${API_URL}/questions`);
                break;
            case '3':
                const email = await question('이메일: ');
                const name = await question('이름: ');
                response = await axios.post(`${API_URL}/auth/register`, {
                    email,
                    password: 'password123',
                    name,
                    role: 'user'
                });
                break;
            case '4':
                const loginEmail = await question('이메일: ');
                response = await axios.post(`${API_URL}/auth/login`, {
                    email: loginEmail,
                    password: 'password123'
                });
                break;
        }
        
        console.log(`\n${c.green}응답:${c.reset}`);
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`\n${c.red}에러:${c.reset} ${error.message}`);
    }
    
    await waitForEnter();
}

// 유틸리티 함수들
function question(prompt) {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
}

async function confirm(prompt) {
    const answer = await question(`${prompt} (y/n): `);
    return answer.toLowerCase() === 'y';
}

async function waitForEnter() {
    await question('\nEnter를 눌러 계속...');
}

// 메인 함수
async function main() {
    // 서버 체크
    try {
        await axios.get('http://localhost:3004/health');
    } catch (error) {
        console.log(`${c.red}❌ 백엔드 서버가 실행되지 않았습니다!${c.reset}`);
        console.log(`\n다음 명령어로 서버를 먼저 실행하세요:`);
        console.log(`${c.yellow}node src/server.js${c.reset}\n`);
        process.exit(1);
    }
    
    while (true) {
        printHeader();
        printMenu();
        
        const choice = await question('선택: ');
        
        switch(choice) {
            case '1':
                await showScenario();
                break;
            case '2':
                await stepByStep();
                break;
            case '3':
                await showChatSimulation();
                await waitForEnter();
                break;
            case '4':
                await apiTest();
                break;
            case '0':
                console.log(`\n${c.green}데모를 종료합니다. 감사합니다!${c.reset}\n`);
                rl.close();
                process.exit(0);
            default:
                console.log(`\n${c.red}잘못된 선택입니다.${c.reset}`);
                await delay(1000);
        }
    }
}

// 시작
console.log(`${c.yellow}🚀 연결이(Yeongyul) 인터랙티브 데모를 시작합니다...${c.reset}\n`);
main();