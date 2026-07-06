const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============================================================================
// THUẬT TOÁN B52 SIÊU CẤP - PHÂN TÍCH ĐA TẦNG VỚI BỘ LỌC THÔNG MINH
// PHÁT HIỆN DÂY THẮNG THỰC TẾ - KHÔNG CỐ ĐOÁN NGƯỢC
// ============================================================================

/**
 * Lớp phân tích dữ liệu nâng cao với nhiều thuật toán con
 */
class B52UltraAnalyzer {
    constructor(historyData) {
        this.rawData = historyData;
        this.validatedData = [];
        this.processedData = [];
        this.analysisResults = {};
        this.initialize();
    }

    initialize() {
        // Bước 1: Lọc và chuẩn hóa dữ liệu
        this.validateAndCleanData();
        // Bước 2: Xử lý sâu dữ liệu
        this.processDeepData();
        // Bước 3: Phân tích đa chiều
        this.multiDimensionalAnalysis();
    }

    /**
     * Bước 1: Xác thực và làm sạch dữ liệu
     */
    validateAndCleanData() {
        this.validatedData = this.rawData.filter(item => {
            const d1 = parseInt(item.Xuc_cac_1 || item.Xuc_xac_1 || 0);
            const d2 = parseInt(item.Xuc_cac_2 || item.Xuc_xac_2 || 0);
            const d3 = parseInt(item.Xuc_cac_3 || item.Xuc_xac_3 || 0);
            return (d1 + d2 + d3) > 0 && d1 >= 1 && d1 <= 6 && d2 >= 1 && d2 <= 6 && d3 >= 1 && d3 <= 6;
        });
    }

    /**
     * Bước 2: Xử lý dữ liệu sâu
     */
    processDeepData() {
        // Lấy 200 phiên gần nhất để phân tích
        const recentData = this.validatedData.slice(-200).reverse();
        
        this.processedData = recentData.map((item, index) => {
            const d1 = parseInt(item.Xuc_cac_1 || item.Xuc_xac_1 || 0);
            const d2 = parseInt(item.Xuc_cac_2 || item.Xuc_xac_2 || 0);
            const d3 = parseInt(item.Xuc_cac_3 || item.Xuc_xac_3 || 0);
            const total = d1 + d2 + d3;
            const side = total >= 11 ? 1 : 0; // 1 = Tài, 0 = Xỉu
            
            // Phân loại tổng điểm
            let totalCategory = 'medium';
            if (total >= 15) totalCategory = 'high';
            else if (total <= 8) totalCategory = 'low';
            
            // Kiểm tra bão
            const isTriple = (d1 === d2 && d2 === d3);
            
            // Kiểm tra đôi
            const isPair = (d1 === d2 || d2 === d3 || d1 === d3) && !isTriple;
            
            // Phân loại cặp xúc xắc
            let pairType = 'none';
            if (isTriple) pairType = 'triple';
            else if (isPair) pairType = 'pair';
            
            return {
                id: parseInt(item.Phien || 0),
                total: total,
                side: side,
                dice: [d1, d2, d3],
                totalCategory: totalCategory,
                isTriple: isTriple,
                isPair: isPair,
                pairType: pairType,
                index: index
            };
        });
    }

    /**
     * Bước 3: Phân tích đa chiều
     */
    multiDimensionalAnalysis() {
        const data = this.processedData;
        const size = data.length;
        
        if (size < 10) {
            this.analysisResults = {
                prediction: 'XỈU',
                rate: 53,
                cau: 'CHƯA ĐỦ DỮ LIỆU',
                confidence: 0.5,
                analysis: 'Không đủ dữ liệu để phân tích'
            };
            return;
        }

        // === PHÂN TÍCH TẦNG 1: THỐNG KÊ CƠ BẢN ===
        const basicStats = this.calculateBasicStats(data);
        
        // === PHÂN TÍCH TẦNG 2: XU HƯỚNG ===
        const trendAnalysis = this.analyzeTrends(data);
        
        // === PHÂN TÍCH TẦNG 3: MÔ HÌNH ===
        const patternAnalysis = this.analyzePatterns(data);
        
        // === PHÂN TÍCH TẦNG 4: DỰ ĐOÁN ===
        const prediction = this.predictWithWeightedScore(
            basicStats,
            trendAnalysis,
            patternAnalysis
        );
        
        this.analysisResults = {
            ...prediction,
            basicStats: basicStats,
            trendAnalysis: trendAnalysis,
            patternAnalysis: patternAnalysis
        };
    }

    /**
     * Tính toán thống kê cơ bản
     */
    calculateBasicStats(data) {
        const size = data.length;
        const sides = data.map(d => d.side);
        const totals = data.map(d => d.total);
        
        // Thống kê theo các khung thời gian
        const windows = [5, 10, 15, 20, 30, 50];
        const stats = {};
        
        windows.forEach(windowSize => {
            if (size >= windowSize) {
                const windowData = data.slice(-windowSize);
                const taiCount = windowData.filter(d => d.side === 1).length;
                const xiuCount = windowData.filter(d => d.side === 0).length;
                const avgTotal = windowData.reduce((s, d) => s + d.total, 0) / windowSize;
                const variance = windowData.reduce((s, d) => s + Math.pow(d.total - avgTotal, 2), 0) / windowSize;
                const stdDev = Math.sqrt(variance);
                
                stats[`window_${windowSize}`] = {
                    tai: taiCount,
                    xiu: xiuCount,
                    taiRate: taiCount / windowSize,
                    xiuRate: xiuCount / windowSize,
                    avgTotal: avgTotal,
                    stdDev: stdDev,
                    minTotal: Math.min(...windowData.map(d => d.total)),
                    maxTotal: Math.max(...windowData.map(d => d.total))
                };
            }
        });
        
        // Thống kê tổng thể
        const totalTai = sides.filter(s => s === 1).length;
        const totalXiu = sides.filter(s => s === 0).length;
        const avgTotalAll = totals.reduce((s, t) => s + t, 0) / size;
        
        // Đếm bão và đôi
        const triples = data.filter(d => d.isTriple).length;
        const pairs = data.filter(d => d.isPair).length;
        
        return {
            total: {
                tai: totalTai,
                xiu: totalXiu,
                taiRate: totalTai / size,
                xiuRate: totalXiu / size,
                avgTotal: avgTotalAll,
                size: size
            },
            windows: stats,
            specialPatterns: {
                triples: triples,
                triplesRate: triples / size,
                pairs: pairs,
                pairsRate: pairs / size
            }
        };
    }

    /**
     * Phân tích xu hướng
     */
    analyzeTrends(data) {
        const size = data.length;
        const sides = data.map(d => d.side);
        const totals = data.map(d => d.total);
        
        // 1. Phân tích streak hiện tại
        let currentStreak = 1;
        let currentSide = sides[size - 1];
        for (let i = size - 2; i >= 0; i--) {
            if (sides[i] === currentSide) currentStreak++;
            else break;
        }
        
        // 2. Tìm streak lớn nhất
        let maxStreak = 1;
        let currentMax = 1;
        for (let i = 1; i < size; i++) {
            if (sides[i] === sides[i-1]) {
                currentMax++;
                maxStreak = Math.max(maxStreak, currentMax);
            } else {
                currentMax = 1;
            }
        }
        
        // 3. Phân tích momentum (động lượng)
        let momentum = 0;
        for (let i = 1; i < Math.min(10, size); i++) {
            momentum += (sides[size - i] === sides[size - i - 1]) ? 1 : -1;
        }
        momentum = momentum / Math.min(10, size);
        
        // 4. Phân tích chu kỳ biến động
        let volatility = 0;
        for (let i = 1; i < Math.min(20, size); i++) {
            volatility += Math.abs(sides[i] - sides[i-1]);
        }
        volatility = volatility / Math.min(20, size);
        
        // 5. Dự đoán xu hướng sắp tới
        let trendStrength = Math.min(Math.abs(momentum), 1);
        let trendDirection = momentum > 0 ? 'continuation' : 'reversal';
        
        // Kiểm tra xem có đang ở điểm gãy không
        let atBreakPoint = false;
        if (currentStreak >= 5 && volatility < 0.3) {
            atBreakPoint = true;
        }
        
        return {
            currentStreak: currentStreak,
            currentSide: currentSide === 1 ? 'TÀI' : 'XỈU',
            maxStreak: maxStreak,
            momentum: momentum,
            trendStrength: trendStrength,
            trendDirection: trendDirection,
            volatility: volatility,
            atBreakPoint: atBreakPoint
        };
    }

    /**
     * Phân tích mô hình và mẫu
     */
    analyzePatterns(data) {
        const size = data.length;
        const sides = data.map(d => d.side);
        const totals = data.map(d => d.total);
        
        // 1. Phân tích mẫu 3-5 phiên gần nhất
        const patterns = {};
        const windows = [3, 4, 5];
        
        windows.forEach(w => {
            if (size >= w) {
                const recentPattern = sides.slice(-w);
                const patternKey = recentPattern.join(',');
                
                // Tìm các lần xuất hiện trước đó của mẫu này
                let occurrences = 0;
                let nextResults = [];
                
                for (let i = 0; i <= size - w - 1; i++) {
                    const currentPattern = sides.slice(i, i + w);
                    if (currentPattern.join(',') === patternKey) {
                        occurrences++;
                        if (i + w < size) {
                            nextResults.push(sides[i + w]);
                        }
                    }
                }
                
                // Dự đoán kết quả tiếp theo dựa trên mẫu
                let predictedNext = null;
                if (nextResults.length > 0) {
                    const taiNext = nextResults.filter(r => r === 1).length;
                    const xiuNext = nextResults.filter(r => r === 0).length;
                    predictedNext = taiNext > xiuNext ? 'TÀI' : (xiuNext > taiNext ? 'XỈU' : 'CÂN BẰNG');
                }
                
                patterns[`pattern_${w}`] = {
                    pattern: patternKey,
                    occurrences: occurrences,
                    nextResults: nextResults,
                    predictedNext: predictedNext,
                    confidence: nextResults.length > 0 ? (Math.max(taiNext || 0, xiuNext || 0) / nextResults.length) : 0
                };
            }
        });
        
        // 2. Phân tích tổng điểm
        let totalTrend = [];
        for (let i = 1; i < Math.min(10, size); i++) {
            totalTrend.push(totals[size - i] - totals[size - i - 1]);
        }
        const avgChange = totalTrend.reduce((s, c) => s + c, 0) / totalTrend.length;
        
        // 3. Phân tích theo ngày (nếu có)
        // 4. Phân tích theo giờ (nếu có)
        
        return {
            patterns: patterns,
            totalTrend: {
                avgChange: avgChange,
                direction: avgChange > 0 ? 'INCREASING' : (avgChange < 0 ? 'DECREASING' : 'STABLE')
            }
        };
    }

    /**
     * Dự đoán với trọng số thông minh
     */
    predictWithWeightedScore(basicStats, trendAnalysis, patternAnalysis) {
        let taiScore = 0;
        let xiuScore = 0;
        let confidenceScore = 0;
        let predictionFactors = [];
        
        // === 1. PHÂN TÍCH CỬA SỔ GẦN NHẤT (TRỌNG SỐ CAO) ===
        const window5 = basicStats.windows.window_5;
        if (window5) {
            if (window5.taiRate > 0.6) {
                taiScore += 1.5 * (window5.taiRate - 0.6) * 100;
                predictionFactors.push(`Tài thắng ${window5.tai}/${5} phiên gần nhất`);
            } else if (window5.xiuRate > 0.6) {
                xiuScore += 1.5 * (window5.xiuRate - 0.6) * 100;
                predictionFactors.push(`Xỉu thắng ${window5.xiu}/${5} phiên gần nhất`);
            }
        }
        
        const window10 = basicStats.windows.window_10;
        if (window10) {
            if (window10.taiRate > 0.65) {
                taiScore += 1.2 * (window10.taiRate - 0.65) * 100;
                predictionFactors.push(`Tài chiếm ưu thế ${window10.tai}/${10} phiên`);
            } else if (window10.xiuRate > 0.65) {
                xiuScore += 1.2 * (window10.xiuRate - 0.65) * 100;
                predictionFactors.push(`Xỉu chiếm ưu thế ${window10.xiu}/${10} phiên`);
            }
        }
        
        // === 2. PHÂN TÍCH XU HƯỚNG (TRỌNG SỐ TRUNG BÌNH) ===
        if (trendAnalysis.currentStreak >= 3) {
            if (trendAnalysis.currentSide === 'TÀI') {
                taiScore += 0.8 * trendAnalysis.currentStreak;
                predictionFactors.push(`Streak Tài ${trendAnalysis.currentStreak} phiên`);
            } else {
                xiuScore += 0.8 * trendAnalysis.currentStreak;
                predictionFactors.push(`Streak Xỉu ${trendAnalysis.currentStreak} phiên`);
            }
        }
        
        if (trendAnalysis.momentum > 0.3) {
            taiScore += 0.5 * trendAnalysis.momentum * 100;
            predictionFactors.push(`Động lượng dương ${Math.round(trendAnalysis.momentum * 100)}%`);
        } else if (trendAnalysis.momentum < -0.3) {
            xiuScore += 0.5 * Math.abs(trendAnalysis.momentum) * 100;
            predictionFactors.push(`Động lượng âm ${Math.round(Math.abs(trendAnalysis.momentum) * 100)}%`);
        }
        
        // === 3. PHÂN TÍCH MẪU (TRỌNG SỐ TRUNG BÌNH) ===
        const pattern5 = patternAnalysis.patterns.pattern_5;
        if (pattern5 && pattern5.confidence > 0.6) {
            if (pattern5.predictedNext === 'TÀI') {
                taiScore += 0.7 * pattern5.confidence * 100;
                predictionFactors.push(`Mẫu dự đoán Tài với độ tin cậy ${Math.round(pattern5.confidence * 100)}%`);
            } else if (pattern5.predictedNext === 'XỈU') {
                xiuScore += 0.7 * pattern5.confidence * 100;
                predictionFactors.push(`Mẫu dự đoán Xỉu với độ tin cậy ${Math.round(pattern5.confidence * 100)}%`);
            }
        }
        
        // === 4. PHÂN TÍCH ĐẶC BIỆT ===
        // 4.1. Bão - Đảo chiều mạnh
        const lastItem = this.processedData[this.processedData.length - 1];
        if (lastItem.isTriple) {
            if (lastItem.side === 1) {
                xiuScore += 3; // Bão Tài -> Dự đoán Xỉu
                predictionFactors.push('Bão Tài xuất hiện - Dự đoán đảo chiều');
            } else {
                taiScore += 3; // Bão Xỉu -> Dự đoán Tài
                predictionFactors.push('Bão Xỉu xuất hiện - Dự đoán đảo chiều');
            }
        }
        
        // 4.2. Tổng điểm quá cao hoặc quá thấp
        const avgTotal = basicStats.total.avgTotal;
        const lastTotal = lastItem.total;
        if (lastTotal >= 15 && avgTotal > 11) {
            xiuScore += 1.5;
            predictionFactors.push('Tổng điểm quá cao - Dự đoán giảm');
        } else if (lastTotal <= 8 && avgTotal < 10) {
            taiScore += 1.5;
            predictionFactors.push('Tổng điểm quá thấp - Dự đoán tăng');
        }
        
        // 4.3. Volatility thấp -> Chu kỳ đảo chiều
        if (trendAnalysis.volatility < 0.3 && trendAnalysis.currentStreak >= 4) {
            if (trendAnalysis.currentSide === 'TÀI') {
                xiuScore += 2;
                predictionFactors.push('Độ biến động thấp - Dự đoán đảo chiều');
            } else {
                taiScore += 2;
                predictionFactors.push('Độ biến động thấp - Dự đoán đảo chiều');
            }
        }
        
        // 4.4. Phân tích tổng điểm gần đây
        const recentTotals = this.processedData.slice(-10).map(d => d.total);
        const recentAvg = recentTotals.reduce((s, t) => s + t, 0) / recentTotals.length;
        const totalVariance = recentTotals.reduce((s, t) => s + Math.pow(t - recentAvg, 2), 0) / recentTotals.length;
        
        if (totalVariance < 5 && recentAvg > 10) {
            // Tổng điểm ổn định ở mức cao -> Khả năng xỉu
            xiuScore += 1;
            predictionFactors.push('Tổng điểm ổn định cao - Dự đoán xỉu');
        } else if (totalVariance < 5 && recentAvg < 10) {
            // Tổng điểm ổn định ở mức thấp -> Khả năng tài
            taiScore += 1;
            predictionFactors.push('Tổng điểm ổn định thấp - Dự đoán tài');
        }
        
        // === 5. TÍNH ĐIỂM TIN CẬY ===
        const totalScore = taiScore + xiuScore;
        let prediction = 'XỈU';
        let rate = 53;
        let cau = '';
        let confidence = 0.5;
        
        if (totalScore > 0) {
            const taiRatio = taiScore / totalScore;
            const xiuRatio = xiuScore / totalScore;
            
            if (taiRatio > xiuRatio) {
                prediction = 'TÀI';
                rate = Math.min(53 + Math.round(taiRatio * 35), 88);
                confidence = taiRatio;
            } else {
                prediction = 'XỈU';
                rate = Math.min(53 + Math.round(xiuRatio * 35), 88);
                confidence = xiuRatio;
            }
        } else {
            // Nếu không có dữ liệu đủ mạnh, dùng xu hướng tổng thể
            const totalTai = basicStats.total.tai;
            const totalXiu = basicStats.total.xiu;
            if (totalTai > totalXiu) {
                prediction = 'TÀI';
                rate = 55;
                confidence = 0.55;
                predictionFactors.push('Theo xu hướng tổng thể - Tài');
            } else {
                prediction = 'XỈU';
                rate = 55;
                confidence = 0.55;
                predictionFactors.push('Theo xu hướng tổng thể - Xỉu');
            }
        }
        
        // Xác định cầu
        if (predictionFactors.length > 0) {
            cau = predictionFactors.slice(0, 3).join(' | ');
        } else {
            cau = 'KHÔNG CÓ CẦU RÕ RÀNG';
        }
        
        // Điều chỉnh tỉ lệ dựa trên điểm tin cậy
        const finalRate = Math.min(Math.max(rate + Math.round((confidence - 0.5) * 20), 53), 88);
        
        return {
            prediction: prediction,
            rate: finalRate,
            cau: cau,
            confidence: confidence,
            taiScore: taiScore,
            xiuScore: xiuScore
        };
    }

    /**
     * Lấy kết quả phân tích cuối cùng
     */
    getResults() {
        return this.analysisResults;
    }
}

// ============================================================================
// MIDDLEWARE XỬ LÝ DỮ LIỆU CHÍNH
// ============================================================================

function executeUltraHardcoreLogicChain(historyData) {
    try {
        const analyzer = new B52UltraAnalyzer(historyData);
        const results = analyzer.getResults();
        
        return {
            prediction: results.prediction || "XỈU",
            rate: `${results.rate || 53}%`,
            cau: results.cau || "KHÔNG CÓ CẦU RÕ RÀNG",
            confidence: results.confidence || 0.5,
            taiScore: results.taiScore || 0,
            xiuScore: results.xiuScore || 0
        };
    } catch (error) {
        console.error('Lỗi phân tích:', error);
        return {
            prediction: "XỈU",
            rate: "53%",
            cau: "LỖI PHÂN TÍCH, SỬ DỤNG MẶC ĐỊNH"
        };
    }
}

// --- ROUTE API GIỮ NGUYÊN JSON ---
app.get('/api/predict', async (req, res) => {
    try {
        const response = await axios.get('https://b52-qiw2.onrender.com/api/history', { timeout: 6000 });
        const resData = response.data;

        let history = [];
        if (resData && resData.data && Array.isArray(resData.data)) {
            history = resData.data;
        } else if (Array.isArray(resData)) {
            history = resData;
        } else {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.status(500).send("Dữ liệu đầu vào của hệ thống trống.");
        }

        let latestValidSession = null;
        let validHistory = [];
        for (let i = 0; i < history.length; i++) {
            const d1 = parseInt(history[i].Xuc_cac_1 || history[i].Xuc_xac_1 || 0);
            const d2 = parseInt(history[i].Xuc_cac_2 || history[i].Xuc_xac_2 || 0);
            const d3 = parseInt(history[i].Xuc_cac_3 || history[i].Xuc_xac_3 || 0);
            if ((d1 + d2 + d3) > 0) {
                validHistory.push(history[i]);
                if (!latestValidSession) {
                    latestValidSession = history[i];
                }
            }
        }

        if (!latestValidSession || validHistory.length < 3) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.status(500).send("Không định vị được phiên dữ liệu sạch.");
        }

        const d1 = parseInt(latestValidSession.Xuc_cac_1 || latestValidSession.Xuc_xac_1 || 0);
        const d2 = parseInt(latestValidSession.Xuc_cac_2 || latestValidSession.Xuc_xac_2 || 0);
        const d3 = parseInt(latestValidSession.Xuc_cac_3 || latestValidSession.Xuc_xac_3 || 0);
        const currentPhien = parseInt(latestValidSession.Phien || 0);
        const currentTong = d1 + d2 + d3;

        const logicResult = executeUltraHardcoreLogicChain(validHistory);
        const nextPhien = currentPhien + 1;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        
        const outputResponse = 
`Phiên: ${currentPhien}
Xuc xac1-3: ${d1}-${d2}-${d3}
Tong: ${currentTong}
Phiên dự đoán: ${nextPhien}
Dự đoán: ${logicResult.prediction}
Tỉ lệ: ${logicResult.rate}
Cầu: ${logicResult.cau}
Id: @tranhoang2286`;

        return res.send(outputResponse);

    } catch (error) {
        console.error('API Error:', error.message);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(500).send(`Hệ thống đang đồng bộ dữ liệu phiên mới...\nId: @tranhoang2286`);
    }
});

app.get('/', (req, res) => {
    res.send("HỆ THỐNG PHÁT HIỆN DÂY THẮNG ONLINE - BẢN NÂNG CẤP SIÊU CẤP");
});

app.listen(PORT, () => {
    console.log(`[ONLINE] Khởi chạy thành công bộ lõi theo dây thắng trên cổng: ${PORT}`);
});
