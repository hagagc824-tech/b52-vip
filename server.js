const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============================================================================
// THUẬT TOÁN THỐNG KÊ THUẦN TÚY - KHÔNG THIÊN VỊ TUYỆT ĐỐI
// PHÂN TÍCH KHÁCH QUAN DỰA TRÊN DỮ LIỆU THỰC TẾ
// ============================================================================

class ThongKeThuanTuy {
    constructor(data) {
        this.data = data;
        this.ketQua = {};
        this.phanTich();
    }

    phanTich() {
        const size = this.data.length;
        if (size < 10) {
            this.ketQua = {
                prediction: 'XIU',
                rate: 50,
                cau: 'CHUA_DU_DU_LIEU'
            };
            return;
        }

        // ================================================================
        // 1. THỐNG KÊ CƠ BẢN - KHÔNG THIÊN VỊ
        // ================================================================
        
        // Đếm tổng Tài/Xỉu
        let tongTai = 0;
        let tongXiu = 0;
        this.data.forEach(d => {
            if (d.side === 'TAI') tongTai++;
            else tongXiu++;
        });

        const tyLeTaiTong = tongTai / size;
        const tyLeXiuTong = tongXiu / size;
        const chenhLechTong = Math.abs(tyLeTaiTong - tyLeXiuTong);

        // ================================================================
        // 2. THỐNG KÊ CỬA SỔ ĐỘNG
        // ================================================================
        
        const windows = [3, 5, 7, 10, 15, 20];
        const thongKeCuaSo = {};
        
        windows.forEach(w => {
            if (size >= w) {
                const dataW = this.data.slice(-w);
                const tai = dataW.filter(d => d.side === 'TAI').length;
                const xiu = dataW.filter(d => d.side === 'XIU').length;
                thongKeCuaSo[`w${w}`] = {
                    tai: tai,
                    xiu: xiu,
                    tyLeTai: tai / w,
                    tyLeXiu: xiu / w,
                    chenhLech: Math.abs(tai - xiu) / w
                };
            }
        });

        // ================================================================
        // 3. PHÂN TÍCH STREAK (DÂY THẮNG)
        // ================================================================
        
        let currentStreak = 1;
        let currentSide = this.data[size - 1].side;
        for (let i = size - 2; i >= 0; i--) {
            if (this.data[i].side === currentSide) currentStreak++;
            else break;
        }

        // Tìm streak dài nhất
        let maxStreak = 1;
        let streakCount = 1;
        for (let i = 1; i < size; i++) {
            if (this.data[i].side === this.data[i-1].side) {
                streakCount++;
                maxStreak = Math.max(maxStreak, streakCount);
            } else {
                streakCount = 1;
            }
        }

        // ================================================================
        // 4. PHÂN TÍCH MẪU 3 PHIÊN
        // ================================================================
        
        let mau3 = {};
        for (let i = 0; i < size - 3; i++) {
            const key = `${this.data[i].side}-${this.data[i+1].side}-${this.data[i+2].side}`;
            if (!mau3[key]) {
                mau3[key] = { tai: 0, xiu: 0 };
            }
            if (this.data[i+2].side === 'TAI') mau3[key].tai++;
            else mau3[key].xiu++;
        }

        const cauHienTai3 = this.data.slice(-3).map(d => d.side).join('-');
        let duDoanMau3 = null;
        let tinCayMau3 = 0;
        
        if (mau3[cauHienTai3]) {
            const m = mau3[cauHienTai3];
            const tong = m.tai + m.xiu;
            if (tong > 0) {
                const tyLeTai = m.tai / tong;
                const tyLeXiu = m.xiu / tong;
                if (Math.abs(tyLeTai - tyLeXiu) > 0.2) {
                    duDoanMau3 = tyLeTai > tyLeXiu ? 'TAI' : 'XIU';
                    tinCayMau3 = Math.abs(tyLeTai - tyLeXiu);
                }
            }
        }

        // ================================================================
        // 5. PHÂN TÍCH TỔNG ĐIỂM
        // ================================================================
        
        const tongDiem = this.data.map(d => d.total);
        const avgTotal = tongDiem.reduce((s, c) => s + c, 0) / size;
        const last5Avg = tongDiem.slice(-5).reduce((s, c) => s + c, 0) / Math.min(5, size);
        const last10Avg = tongDiem.slice(-10).reduce((s, c) => s + c, 0) / Math.min(10, size);

        // Xu hướng điểm
        let xuHuongDiem = 0;
        for (let i = 1; i < Math.min(10, size); i++) {
            xuHuongDiem += tongDiem[size - i] - tongDiem[size - i - 1];
        }
        xuHuongDiem = xuHuongDiem / Math.min(10, size);

        // ================================================================
        // 6. PHÂN TÍCH BÃO
        // ================================================================
        
        const baoCount = this.data.filter(d => d.isTriple).length;
        const baoRate = baoCount / size;
        const lastBao = this.data.slice(-10).filter(d => d.isTriple);
        const hasRecentBao = lastBao.length > 0;

        // ================================================================
        // 7. PHÂN TÍCH KHUNG GIỜ (nếu có)
        // ================================================================
        
        // ================================================================
        // 8. TỔNG HỢP KHÁCH QUAN - KHÔNG CỘNG ĐIỂM
        // ================================================================
        
        // Đếm số lần mỗi bên được dự đoán bởi các phương pháp
        let votesTai = 0;
        let votesXiu = 0;
        let votesTrungLap = 0;
        let cacYeuTo = [];

        // Phương pháp 1: Thống kê tổng thể
        if (chenhLechTong > 0.1) {
            if (tyLeTaiTong > tyLeXiuTong) {
                votesTai++;
                cacYeuTo.push(`Tổng thể Tài ${(tyLeTaiTong*100).toFixed(1)}%`);
            } else {
                votesXiu++;
                cacYeuTo.push(`Tổng thể Xỉu ${(tyLeXiuTong*100).toFixed(1)}%`);
            }
        } else {
            votesTrungLap++;
            cacYeuTo.push('Tổng thể cân bằng');
        }

        // Phương pháp 2: Cửa sổ 5 phiên
        if (thongKeCuaSo.w5 && thongKeCuaSo.w5.chenhLech > 0.2) {
            if (thongKeCuaSo.w5.tyLeTai > thongKeCuaSo.w5.tyLeXiu) {
                votesTai++;
                cacYeuTo.push(`5 phiên Tài ${thongKeCuaSo.w5.tai}/5`);
            } else {
                votesXiu++;
                cacYeuTo.push(`5 phiên Xỉu ${thongKeCuaSo.w5.xiu}/5`);
            }
        } else {
            votesTrungLap++;
            cacYeuTo.push('5 phiên cân bằng');
        }

        // Phương pháp 3: Cửa sổ 10 phiên
        if (thongKeCuaSo.w10 && thongKeCuaSo.w10.chenhLech > 0.15) {
            if (thongKeCuaSo.w10.tyLeTai > thongKeCuaSo.w10.tyLeXiu) {
                votesTai++;
                cacYeuTo.push(`10 phiên Tài ${thongKeCuaSo.w10.tai}/10`);
            } else {
                votesXiu++;
                cacYeuTo.push(`10 phiên Xỉu ${thongKeCuaSo.w10.xiu}/10`);
            }
        } else {
            votesTrungLap++;
            cacYeuTo.push('10 phiên cân bằng');
        }

        // Phương pháp 4: Streak hiện tại
        if (currentStreak >= 4) {
            if (currentSide === 'TAI') {
                votesTai++;
                cacYeuTo.push(`Streak Tài ${currentStreak} phiên`);
            } else {
                votesXiu++;
                cacYeuTo.push(`Streak Xỉu ${currentStreak} phiên`);
            }
        } else if (currentStreak >= 2) {
            // Streak ngắn - ít tin cậy hơn
            if (currentSide === 'TAI') {
                votesTai += 0.5;
                cacYeuTo.push(`Streak nhẹ Tài ${currentStreak} phiên`);
            } else {
                votesXiu += 0.5;
                cacYeuTo.push(`Streak nhẹ Xỉu ${currentStreak} phiên`);
            }
        } else {
            votesTrungLap++;
            cacYeuTo.push('Không streak rõ ràng');
        }

        // Phương pháp 5: Mẫu 3 phiên
        if (duDoanMau3 && tinCayMau3 > 0.2) {
            if (duDoanMau3 === 'TAI') {
                votesTai += tinCayMau3;
                cacYeuTo.push(`Mẫu 3 phiên dự Tài (${(tinCayMau3*100).toFixed(0)}%)`);
            } else {
                votesXiu += tinCayMau3;
                cacYeuTo.push(`Mẫu 3 phiên dự Xỉu (${(tinCayMau3*100).toFixed(0)}%)`);
            }
        } else {
            votesTrungLap += 0.5;
            cacYeuTo.push('Mẫu 3 phiên không rõ');
        }

        // Phương pháp 6: Xu hướng tổng điểm
        if (Math.abs(xuHuongDiem) > 0.5) {
            if (xuHuongDiem > 0) {
                // Điểm đang tăng -> khả năng Tài
                votesTai += 0.5;
                cacYeuTo.push(`Điểm tăng ${xuHuongDiem.toFixed(1)}`);
            } else {
                // Điểm đang giảm -> khả năng Xỉu
                votesXiu += 0.5;
                cacYeuTo.push(`Điểm giảm ${Math.abs(xuHuongDiem).toFixed(1)}`);
            }
        } else {
            votesTrungLap += 0.5;
            cacYeuTo.push('Điểm ổn định');
        }

        // Phương pháp 7: Bão
        if (hasRecentBao) {
            const lastBaoSide = lastBao[lastBao.length - 1].side;
            // Bão thường dẫn đến đảo chiều
            if (lastBaoSide === 'TAI') {
                votesXiu += 1;
                cacYeuTo.push('Bão Tài -> đảo chiều Xỉu');
            } else {
                votesTai += 1;
                cacYeuTo.push('Bão Xỉu -> đảo chiều Tài');
            }
        } else {
            votesTrungLap += 0.5;
            cacYeuTo.push('Không có bão gần đây');
        }

        // ================================================================
        // QUYẾT ĐỊNH CUỐI CÙNG - KHÔNG THIÊN VỊ
        // ================================================================
        
        let prediction = 'XIU';
        let rate = 50;
        let cau = '';

        // So sánh số phiếu
        const chenhLechVote = Math.abs(votesTai - votesXiu);
        
        if (chenhLechVote > 0.5) {
            // Có sự khác biệt rõ ràng
            if (votesTai > votesXiu) {
                prediction = 'TAI';
                // Tỉ lệ dựa trên độ chênh lệch
                const tyLe = votesTai / (votesTai + votesXiu);
                rate = Math.min(50 + Math.round((tyLe - 0.5) * 60), 80);
            } else {
                prediction = 'XIU';
                const tyLe = votesXiu / (votesTai + votesXiu);
                rate = Math.min(50 + Math.round((tyLe - 0.5) * 60), 80);
            }
        } else {
            // Cân bằng - dùng dữ liệu gần nhất
            const lastSide = this.data[size - 1].side;
            prediction = lastSide;
            rate = 52;
            cacYeuTo.push('Cân bằng - theo phiên cuối');
        }

        // Đảm bảo tỉ lệ không quá cao
        rate = Math.max(50, Math.min(rate, 80));

        // Tạo cầu
        cau = cacYeuTo.slice(0, 5).join(' | ');

        // Log để debug
        console.log(`[VOTE] Tài: ${votesTai.toFixed(1)}, Xỉu: ${votesXiu.toFixed(1)}, Pred: ${prediction}, Rate: ${rate}%`);

        this.ketQua = {
            prediction: prediction,
            rate: rate,
            cau: cau,
            chiTiet: {
                votesTai: votesTai,
                votesXiu: votesXiu,
                chenhLechVote: chenhLechVote,
                soYeuTo: cacYeuTo.length
            }
        };
    }

    getResults() {
        return this.ketQua;
    }
}

// ============================================================================
// XỬ LÝ DỮ LIỆU
// ============================================================================

function xuLyDuLieu(historyData) {
    const cleanData = historyData.filter(item => {
        const d1 = parseInt(item.Xuc_cac_1 || item.Xuc_xac_1 || 0);
        const d2 = parseInt(item.Xuc_cac_2 || item.Xuc_xac_2 || 0);
        const d3 = parseInt(item.Xuc_cac_3 || item.Xuc_xac_3 || 0);
        return (d1 + d2 + d3) > 0;
    });

    return cleanData.slice(-150).reverse().map(item => {
        const d1 = parseInt(item.Xuc_cac_1 || item.Xuc_xac_1 || 0);
        const d2 = parseInt(item.Xuc_cac_2 || item.Xuc_xac_2 || 0);
        const d3 = parseInt(item.Xuc_cac_3 || item.Xuc_xac_3 || 0);
        const total = d1 + d2 + d3;
        return {
            id: parseInt(item.Phien || 0),
            total: total,
            side: total >= 11 ? 'TAI' : 'XIU',
            dice: [d1, d2, d3],
            isTriple: (d1 === d2 && d2 === d3)
        };
    });
}

// ============================================================================
// HÀM DỰ ĐOÁN
// ============================================================================

function duDoan(historyData) {
    try {
        const data = xuLyDuLieu(historyData);
        const thongKe = new ThongKeThuanTuy(data);
        const results = thongKe.getResults();
        
        return {
            prediction: results.prediction || "XIU",
            rate: `${results.rate || 53}%`,
            cau: results.cau || "KHONG_CO_CAU"
        };
    } catch (error) {
        console.error('Lỗi:', error);
        return {
            prediction: "XIU",
            rate: "53%",
            cau: "LOI_HE_THONG"
        };
    }
}

// ============================================================================
// ROUTE API
// ============================================================================

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
            return res.status(500).send("Dữ liệu đầu vào trống.");
        }

        let latestValidSession = null;
        for (let i = 0; i < history.length; i++) {
            const d1 = parseInt(history[i].Xuc_cac_1 || history[i].Xuc_xac_1 || 0);
            const d2 = parseInt(history[i].Xuc_cac_2 || history[i].Xuc_xac_2 || 0);
            const d3 = parseInt(history[i].Xuc_cac_3 || history[i].Xuc_xac_3 || 0);
            if ((d1 + d2 + d3) > 0) {
                latestValidSession = history[i];
                break;
            }
        }

        if (!latestValidSession) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.status(500).send("Không tìm thấy phiên dữ liệu sạch.");
        }

        const d1 = parseInt(latestValidSession.Xuc_cac_1 || latestValidSession.Xuc_xac_1 || 0);
        const d2 = parseInt(latestValidSession.Xuc_cac_2 || latestValidSession.Xuc_xac_2 || 0);
        const d3 = parseInt(latestValidSession.Xuc_cac_3 || latestValidSession.Xuc_xac_3 || 0);
        const currentPhien = parseInt(latestValidSession.Phien || 0);
        const currentTong = d1 + d2 + d3;

        const logicResult = duDoan(history);
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
        return res.status(500).send(`Hệ thống đang đồng bộ dữ liệu...\nId: @tranhoang2286`);
    }
});

app.get('/', (req, res) => {
    res.send("HỆ THỐNG THỐNG KÊ THUẦN TÚY - KHÔNG THIÊN VỊ TUYỆT ĐỐI");
});

app.listen(PORT, () => {
    console.log(`[ONLINE] Hệ thống đã sẵn sàng trên cổng: ${PORT}`);
});
