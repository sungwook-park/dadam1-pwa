// scripts/settlement/settlement-calculator.js (v2.1)
// 협업 시 작업자별 매출 분할 방식

/**
 * 하루 전체 정산 계산
 */
export function calculateNewDaySettlement(tasks, allUsers, allOutboundParts, priceMap) {
  console.log('=== 새로운 정산 계산 시작 ===');
  console.log('작업 수:', tasks.length);
  console.log('직원 수:', allUsers.length);
  
  // 임원과 도급기사 구분
  const executives = allUsers.filter(u => u.type === 'executive');
  const contractWorkers = allUsers.filter(u => u.type === 'contract_worker');
  
  console.log('임원:', executives.map(e => e.name));
  console.log('도급기사:', contractWorkers.map(c => c.name));
  
  // 분배비율 합계 계산
  const totalRatio = executives.reduce((sum, exec) => sum + (exec.ratio || 0), 0);
  
  // 초기값 설정
  const result = {
    // 전체 통계
    totalRevenue: 0,
    totalPartCost: 0,
    totalFee: 0,
    totalProfit: 0,
    
    // 임원 정산
    executiveRevenue: 0,
    executivePartCost: 0,
    executiveFee: 0,
    executiveProfit: 0,
    executiveCompanyFund: 0,
    executiveDistribution: {},
    
    // 도급기사 정산
    contractRevenue: 0,
    contractPartCost: 0,
    contractFee: 0,
    contractProfit: 0,
    contractPayments: {},
    contractRemainder: 0,
    contractCompanyFund: 0,
    contractToExecutives: {},
    contractToExecutivesBeforeFee: 0, // 도급기사 매출 × 30%
    contractGongganFee: 0, // 공간티비 수수료
    
    // 최종 정산
    companyFund: 0,
    finalDistribution: {},
    
    // 상세 내역
    taskDetails: [],
    outboundDetails: []
  };
  
  // 임원별 초기화
  executives.forEach(exec => {
    result.executiveDistribution[exec.name] = 0;
    result.contractToExecutives[exec.name] = 0;
    result.finalDistribution[exec.name] = 0;
  });
  
  // 도급기사별 초기화
  contractWorkers.forEach(worker => {
    result.contractPayments[worker.name] = 0;
    result.finalDistribution[worker.name] = 0;
  });
  
  // 🔥 도급기사별 상세 내역 추적
  result.contractWorkerDetails = {};
  contractWorkers.forEach(worker => {
    result.contractWorkerDetails[worker.name] = {
      partsCost: 0,          // 사용한 부품비
      generalFee: 0,         // 일반 수수료
      revenue: 0,            // 담당 매출
      payment: 0,            // 최종 수령액 (70%)
      companyPayment: 0,     // 회사 지급 총액
      executiveShare: 0,     // 임원 몫 (30%)
      gongganFee: 0          // 공간티비 수수료
    };
  });
  
  // 📌 작업별 처리 (협업 시 작업자별 분할)
  tasks.forEach(task => {
    const revenue = Number(task.amount) || 0;
    const workerNames = task.worker ? task.worker.split(',').map(w => w.trim()) : [];
    const workerCount = workerNames.length || 1;
    
    // 부품비 계산
    let partCost = 0;
    const taskOutboundParts = allOutboundParts.filter(part => part.taskId === task.id);
    
    console.log(`🔍 작업 ${task.id} 부품비 계산:`);
    console.log(`  전체 출고 부품: ${allOutboundParts.length}개`);
    console.log(`  이 작업의 출고: ${taskOutboundParts.length}개`);
    
    if (taskOutboundParts.length > 0) {
      partCost = taskOutboundParts.reduce((sum, part) => sum + (part.totalAmount || 0), 0);
      console.log(`  출고 부품 금액: ${partCost.toLocaleString()}원`);
      console.log(`  출고 상세:`, taskOutboundParts);
    } else if (task.parts) {
      console.log(`  task.parts 필드 사용: "${task.parts}"`);
      
      // JSON 형식인지 확인
      if (task.parts.trim().startsWith('[') || task.parts.trim().startsWith('{')) {
        // JSON 형식으로 파싱
        try {
          const partsArray = JSON.parse(task.parts);
          console.log(`  📦 JSON 형식 감지, 파싱 완료`);
          
          if (Array.isArray(partsArray)) {
            partsArray.forEach(part => {
              const partName = part.name || '';
              const quantity = Number(part.quantity) || 1;
              const price = Number(part.price) || 0;
              const itemCost = price * quantity;
              console.log(`    ${partName} × ${quantity} = ${itemCost}원 (단가: ${price}원)`);
              partCost += itemCost;
            });
          }
        } catch (err) {
          console.error(`  ⚠️ JSON 파싱 실패:`, err.message);
        }
      } else {
        // 기존 형식: "벽걸이:1,케이블:2"
        const parts = task.parts.split(',');
        parts.forEach(part => {
          const trimmedPart = part.trim();
          if (trimmedPart) {
            const [name, count] = trimmedPart.split(':');
            const partName = name ? name.trim() : '';
            const partCount = Number(count) || 1;
            const partPrice = priceMap[partName] || 0;
            console.log(`    ${partName} × ${partCount} = ${partPrice * partCount}원 (단가: ${partPrice}원)`);
            partCost += partPrice * partCount;
          }
        });
      }
      console.log(`  task.parts 총액: ${partCost.toLocaleString()}원`);
    } else {
      console.log(`  ⚠️ 부품 데이터 없음 (출고 없음, task.parts 없음)`);
    }
    
    console.log(`  ✅ 최종 부품비: ${partCost.toLocaleString()}원`);
    
    // 수수료 계산
    let fee = 0;
    let isGongganFee = false;
    if (task.client && task.client.includes("공간")) {
      fee = Math.round(revenue * 0.22);
      isGongganFee = true;
    } else if (task.fee && task.fee > 0) {
      fee = Number(task.fee);
    }
    
    // 전체 통계 집계
    result.totalRevenue += revenue;
    result.totalPartCost += partCost;
    result.totalFee += fee;
    
    // 📌 작업자별로 매출/비용 분할
    workerNames.forEach(workerName => {
      const user = allUsers.find(u => u.name === workerName);
      
      if (!user) {
        console.warn(`⚠️ 작업자를 찾을 수 없음: ${workerName}`);
        return;
      }
      
      console.log(`👤 작업자: ${workerName}, 타입: ${user.type}, 수당율: ${user.allowanceRate}%`);
      
      // 작업자 몫 계산 (균등 분할)
      const workerRevenue = revenue / workerCount;
      const workerPartCost = partCost / workerCount;
      
      // 🔥 수수료 계산 로직:
      // - 공간티비 수수료: 협업 시 작업자별로 분할
      // - 일반 수수료: 작업자별로 균등 분할
      let workerFee = 0;
      
      if (isGongganFee) {
        // 공간티비 수수료: 작업자별로 분할
        const myGongganFee = fee / workerCount;
        
        if (user.type === 'executive') {
          // 임원은 자기 몫 수수료 차감
          workerFee = myGongganFee;
          console.log(`  → 임원 공간수수료 차감: ${fee.toLocaleString()} ÷ ${workerCount} = ${myGongganFee.toLocaleString()}원`);
        } else {
          // 도급기사는 차감 안 함 (하지만 임원 30% 몫에서 차감됨)
          workerFee = 0;
          console.log(`  → 도급기사 공간수수료: 차감 안 함 (임원 몫에서 차감 예정)`);
        }
      } else if (fee > 0) {
        // 일반 수수료: 작업자별로 균등 분할하여 각자 차감
        workerFee = fee / workerCount;
        console.log(`  → 일반 수수료 ${workerFee.toLocaleString()}원 차감`);
      }
      
      if (user.type === 'executive') {
        // 임원 몫
        result.executiveRevenue += workerRevenue;
        result.executivePartCost += workerPartCost;
        result.executiveFee += workerFee;
        console.log(`  → 임원 매출: ${workerRevenue.toLocaleString()}원, 수수료: ${workerFee.toLocaleString()}원`);
        
      } else if (user.type === 'contract_worker') {
        // 📌 도급기사 계산 (핵심!)
        // 1. 도급기사 수당 = 매출 × 70% - 부품비 - 일반수수료
        const grossPayment = workerRevenue * (user.allowanceRate / 100); // 매출의 70%
        const netPayment = Math.round(grossPayment - workerPartCost - workerFee);
        
        console.log(`  → 도급기사 수당: ${workerRevenue.toLocaleString()} × ${user.allowanceRate}% = ${grossPayment.toLocaleString()}원`);
        console.log(`  → 차감: 부품비 ${workerPartCost.toLocaleString()}원 + 수수료 ${workerFee.toLocaleString()}원`);
        console.log(`  → 최종 수령: ${netPayment.toLocaleString()}원`);
        
        result.contractPayments[workerName] = (result.contractPayments[workerName] || 0) + netPayment;
        result.finalDistribution[workerName] += netPayment;
        
        // 2. 임원 몫 = 매출 × 30%
        const toExecutives = workerRevenue * 0.3; // 30%는 임원에게
        console.log(`  → 임원에게: ${workerRevenue.toLocaleString()} × 30% = ${toExecutives.toLocaleString()}원`);
        
        // 🔥 상세 내역 기록
        if (result.contractWorkerDetails[workerName]) {
          result.contractWorkerDetails[workerName].revenue += workerRevenue;
          result.contractWorkerDetails[workerName].partsCost += workerPartCost;
          result.contractWorkerDetails[workerName].generalFee += workerFee;
          result.contractWorkerDetails[workerName].payment += netPayment;
          result.contractWorkerDetails[workerName].executiveShare += toExecutives;
          
          // 공간티비 수수료 기록
          if (isGongganFee) {
            const myGongganFee = fee / workerCount;
            result.contractWorkerDetails[workerName].gongganFee += myGongganFee;
          }
        }
        
        // 도급기사 통계에 추가
        result.contractRevenue += workerRevenue;
        result.contractPartCost += workerPartCost;
        result.contractFee += workerFee; // 일반 수수료만 (공간티비는 0)
        
        // 임원에게 갈 금액 누적
        result.contractToExecutivesBeforeFee = (result.contractToExecutivesBeforeFee || 0) + toExecutives;
        
        // 공간티비 수수료는 임원 몫에서 차감 (작업자별 분할)
        if (isGongganFee) {
          const myGongganFee = fee / workerCount;
          result.contractGongganFee = (result.contractGongganFee || 0) + myGongganFee;
          console.log(`  → 공간티비 수수료 ${myGongganFee.toLocaleString()}원은 임원 몫에서 차감 예정 (${fee.toLocaleString()} ÷ ${workerCount})`);
        }
      } else {
        console.warn(`  ⚠️ 알 수 없는 직원 타입: ${user.type}`);
      }
    });
    
    // 작업 상세 저장
    result.taskDetails.push({
      taskId: task.id,
      revenue,
      partCost,
      fee,
      profit: revenue - partCost - fee,
      workers: workerNames,
      client: task.client || '미분류',
      date: task.date
    });
  });
  
  // 임원 매출 정산
  if (result.executiveRevenue > 0) {
    result.executiveProfit = result.executiveRevenue - result.executivePartCost - result.executiveFee;
    result.executiveCompanyFund = Math.round(result.executiveProfit * 0.1); // 10%
    
    const executiveRemain = result.executiveProfit - result.executiveCompanyFund;
    
    // 임원별 분배
    executives.forEach(exec => {
      const share = Math.round(executiveRemain * (exec.ratio / totalRatio));
      result.executiveDistribution[exec.name] = share;
      result.finalDistribution[exec.name] += share;
    });
  }
  
  // 도급기사 매출 정산
  if (result.contractRevenue > 0) {
    result.contractProfit = result.contractRevenue - result.contractPartCost - result.contractFee;
    
    // 도급기사 매출에서 총 수당
    const totalContractPayments = Object.values(result.contractPayments).reduce((sum, p) => sum + p, 0);
    
    // 📌 임원에게 갈 금액 = 도급기사 매출 × 30% - 공간티비 수수료
    const toExecutivesBeforeFee = result.contractToExecutivesBeforeFee || 0;
    const gongganFee = result.contractGongganFee || 0;
    
    result.contractRemainder = Math.round(toExecutivesBeforeFee - gongganFee);
    result.contractCompanyFund = Math.round(result.contractRemainder * 0.1); // 10%
    
    console.log(`📊 도급기사 → 임원 정산:`);
    console.log(`  도급기사 매출 × 30% = ${toExecutivesBeforeFee.toLocaleString()}원`);
    console.log(`  (-) 공간티비 수수료 = ${gongganFee.toLocaleString()}원`);
    console.log(`  = 임원에게 = ${result.contractRemainder.toLocaleString()}원`);
    console.log(`  (-) 회사자금 10% = ${result.contractCompanyFund.toLocaleString()}원`);
    
    const contractToExecRemain = result.contractRemainder - result.contractCompanyFund;
    
    // 임원별 분배
    executives.forEach(exec => {
      const share = Math.round(contractToExecRemain * (exec.ratio / totalRatio));
      result.contractToExecutives[exec.name] = share;
      result.finalDistribution[exec.name] += share;
    });
  }
  
  // 총 회사자금
  result.companyFund = result.executiveCompanyFund + result.contractCompanyFund;
  
  // 총 순이익
  result.totalProfit = result.totalRevenue - result.totalPartCost - result.totalFee;
  
  // 🔥 도급기사별 회사 지급 총액 계산
  contractWorkers.forEach(worker => {
    const details = result.contractWorkerDetails[worker.name];
    if (details) {
      // 회사 지급 총액 = 임원 몫(30% - 공간티비수수료) + 부품비 + 일반수수료
      const executiveShareNet = details.executiveShare - details.gongganFee;
      details.companyPayment = executiveShareNet + details.partsCost + details.generalFee;
      
      console.log(`💰 ${worker.name} 회사 지급 총액: ${details.companyPayment.toLocaleString()}원`);
      console.log(`  = 임원몫 ${executiveShareNet.toLocaleString()} + 부품비 ${details.partsCost.toLocaleString()} + 수수료 ${details.generalFee.toLocaleString()}`);
    }
  });
  
  // 출고 상세 정보
  const selectedTaskIds = tasks.map(task => task.id);
  result.outboundDetails = allOutboundParts.filter(part => 
    selectedTaskIds.includes(part.taskId)
  );
  
  console.log('=== 정산 계산 완료 ===');
  console.log('총 매출:', result.totalRevenue.toLocaleString());
  console.log('총 순이익:', result.totalProfit.toLocaleString());
  console.log('회사자금:', result.companyFund.toLocaleString());
  
  return result;
}

/**
 * 직원별 분석용 계산 (부품비/수수료 포함)
 */
export function calculateWorkerAnalysis(tasks, allUsers, outboundParts = [], priceMap = {}) {
  const workerStats = {};
  
  // 모든 직원 초기화
  allUsers.forEach(user => {
    workerStats[user.name] = {
      name: user.name,
      type: user.type,
      ratio: user.ratio,
      allowanceRate: user.allowanceRate,
      taskCount: 0,
      totalRevenue: 0,
      totalPartCost: 0,
      totalFee: 0,
      totalProfit: 0,
      clientDetails: {}
    };
  });
  
  // 🔥 작업별 처리 (모든 작업자에게 분할)
  tasks.forEach(task => {
    if (!task.worker) return;
    
    const workers = task.worker.split(',').map(w => w.trim()).filter(w => w);
    if (workers.length === 0) return;
    
    const amount = Number(task.amount) || 0;
    const client = task.client || '미분류';
    
    // 🔥 협업일 경우 작업자 수로 분할
    const workerCount = workers.length;
    const amountPerWorker = amount / workerCount;
    
    // 부품비 계산
    let partCost = 0;
    const taskOutboundParts = outboundParts.filter(part => part.taskId === task.id);
    
    if (taskOutboundParts.length > 0) {
      // 출고 데이터 사용
      partCost = taskOutboundParts.reduce((sum, part) => sum + (part.totalAmount || 0), 0);
      console.log(`  📦 [직원별] 작업 ${task.id} 출고 부품: ${taskOutboundParts.length}개, 금액: ${partCost.toLocaleString()}원`);
    } else if (task.parts) {
      // task.parts 필드 사용
      
      // JSON 형식인지 확인
      if (task.parts.trim().startsWith('[') || task.parts.trim().startsWith('{')) {
        // JSON 형식으로 파싱
        try {
          const partsArray = JSON.parse(task.parts);
          console.log(`  📦 [직원별] JSON 형식 감지`);
          
          if (Array.isArray(partsArray)) {
            partsArray.forEach(part => {
              const partName = part.name || '';
              const quantity = Number(part.quantity) || 1;
              const price = Number(part.price) || 0;
              const itemCost = price * quantity;
              partCost += itemCost;
            });
          }
        } catch (err) {
          console.error(`  ⚠️ [직원별] JSON 파싱 실패:`, err.message);
        }
      } else {
        // 기존 형식: "벽걸이:1,케이블:2" 또는 "벽걸이(1),케이블(2)"
        const parts = task.parts.split(',').map(p => p.trim()).filter(p => p);
        parts.forEach(part => {
          // "부품명:개수" 형식
          if (part.includes(':')) {
            const [name, count] = part.split(':');
            const partName = name ? name.trim() : '';
            const partCount = Number(count) || 1;
            const partPrice = priceMap[partName] || 0;
            partCost += partPrice * partCount;
          } 
          // "부품명(개수)" 형식
          else {
            const match = part.match(/^(.+?)\s*\((\d+)\)$/);
            if (match) {
              const partName = match[1].trim();
              const partCount = parseInt(match[2]);
              const partPrice = priceMap[partName] || 0;
              partCost += partPrice * partCount;
            }
          }
        });
      }
      console.log(`  📦 [직원별] 작업 ${task.id} task.parts 계산: ${partCost.toLocaleString()}원`);
    } else {
      console.log(`  ⚠️ [직원별] 작업 ${task.id} 부품 데이터 없음`);
    }
    
    const partCostPerWorker = partCost / workerCount;
    
    // 수수료 계산
    let fee = 0;
    let isGongganFee = false;
    if (task.client && task.client.includes("공간")) {
      fee = Math.round(amount * 0.22);
      isGongganFee = true;
    } else if (task.fee && task.fee > 0) {
      fee = Number(task.fee);
    }
    const feePerWorker = fee / workerCount;
    
    // 🔥 각 작업자에게 분할해서 집계
    workers.forEach(workerName => {
      if (!workerStats[workerName]) return;
      
      // 도급기사는 공간티비 수수료 차감 안 함!
      const workerType = workerStats[workerName].type;
      let workerFee = feePerWorker;
      if (workerType === 'contract_worker' && isGongganFee) {
        workerFee = 0; // 도급기사는 공간티비 수수료 차감 안 함
      }
      
      // 순이익 (도급기사는 공간티비 수수료 제외)
      const profit = amountPerWorker - partCostPerWorker - workerFee;
      
      // 작업자별 집계
      workerStats[workerName].taskCount += 1;
      workerStats[workerName].totalRevenue += amountPerWorker;
      workerStats[workerName].totalPartCost += partCostPerWorker;
      workerStats[workerName].totalFee += workerFee;
      workerStats[workerName].totalProfit += profit;
      
      // 거래처별 분류
      if (!workerStats[workerName].clientDetails[client]) {
        workerStats[workerName].clientDetails[client] = {
          count: 0,
          amount: 0,
          partCost: 0,
          fee: 0,
          profit: 0
        };
      }
      
      workerStats[workerName].clientDetails[client].count += 1;
      workerStats[workerName].clientDetails[client].amount += amountPerWorker;
      workerStats[workerName].clientDetails[client].partCost += partCostPerWorker;
      workerStats[workerName].clientDetails[client].fee += workerFee;
      workerStats[workerName].clientDetails[client].profit += profit;
    });
  });
  
  return workerStats;
}

/**
 * 수수료 분석용 계산 (거래처명 + 주소별 상세)
 */
export function calculateFeeAnalysis(tasks) {
  console.log('📊 수수료 분석 시작, 작업 수:', tasks.length);
  
  const gongganTasks = [];
  const othersTasks = [];
  let gongganTotal = 0;
  let othersTotal = 0;
  
  // 거래처별 통계 (거래처명 + 주소 + 작업ID로 구분)
  const clientStats = {};
  
  tasks.forEach(task => {
    const amount = Number(task.amount) || 0;
    const client = task.client || '미분류';
    const worker = task.worker || '미정';
    
    // 🏗️ 작업 주소 생성 (여러 필드명 확인)
    let address = '';
    let addressSource = '';
    
    // 1순위: address 필드
    if (task.address && task.address.trim()) {
      address = task.address.trim();
      addressSource = 'address';
    } 
    // 2순위: installAddress + removeAddress
    else {
      const removeAddr = task.removeAddress || '';
      const installAddr = task.installAddress || '';
      
      if (removeAddr && installAddr) {
        address = `${removeAddr} → ${installAddr}`;
        addressSource = 'removeAddress + installAddress';
      } else if (installAddr) {
        address = installAddr;
        addressSource = 'installAddress';
      } else if (removeAddr) {
        address = removeAddr;
        addressSource = 'removeAddress';
      }
    }
    
    // 주소가 없으면 명시적 표시
    if (!address) {
      address = '주소 미입력';
      addressSource = 'none';
      console.log(`  ⚠️ 작업 ${task.id}: 주소 없음 (address: ${task.address}, installAddress: ${task.installAddress}, removeAddress: ${task.removeAddress})`);
    } else {
      console.log(`  📍 작업 ${task.id}: 주소="${address}" (출처: ${addressSource})`);
    }
    
    // 🔥 거래처명 + 주소 + 작업ID를 키로 사용 (작업별로 따로 표시!)
    const clientKey = `${client}|||${address}|||${task.id}`; // 작업 ID 추가!
    
    if (task.client && task.client.includes("공간")) {
      const fee = Math.round(amount * 0.22);
      gongganTasks.push({
        ...task,
        calculatedFee: fee,
        displayAddress: address  // 표시용 주소 추가
      });
      gongganTotal += fee;
      
      // 거래처별 집계 (작업별로 개별 표시)
      if (!clientStats[clientKey]) {
        clientStats[clientKey] = {
          client: client,
          address: address,
          taskId: task.id,  // 작업 ID 추가
          count: 1,  // 건별이므로 항상 1
          revenue: amount,
          fee: fee,
          type: 'gonggan',
          worker: worker,  // 단일 작업자
          date: task.date  // 작업 날짜 추가
        };
      }
      
    } else if (task.fee && task.fee > 0) {
      const fee = Number(task.fee);
      othersTasks.push({
        ...task,
        calculatedFee: fee,
        displayAddress: address  // 표시용 주소 추가
      });
      othersTotal += fee;
      
      // 거래처별 집계 (작업별로 개별 표시)
      if (!clientStats[clientKey]) {
        clientStats[clientKey] = {
          client: client,
          address: address,
          taskId: task.id,  // 작업 ID 추가
          count: 1,  // 건별이므로 항상 1
          revenue: amount,
          fee: fee,
          type: 'others',
          worker: worker,  // 단일 작업자
          date: task.date  // 작업 날짜 추가
        };
      }
    }
  });
  
  return {
    gongganTasks,
    othersTasks,
    gongganTotal,
    othersTotal,
    clientStats
  };
}
