const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============================================================================
// THUẬT TOÁN CÂN BẰNG TUYỆT ĐỐI - KHÔNG THIÊN VỊ
// 10 THUẬT TOÁN CON + 1 THUẬT TOÁN CHÍNH
// PHÂN TÍCH KHÁCH QUAN 100%
// ============================================================================

// ============================================================================
// THUẬT TOÁN CON 1: NHẬN DIỆN CẦU (CÂN BẰNG)
// ============================================================================
class CauNhanDien {
    constructor(data) {
        this.data = data;
        this.cauPhatHien = {};
    }

    nhanDien() {
        const size = this.data.length;
        if (size < 10) return { cauHienTai: [], loaiCau: 'CHUA_DU_DU_LIEU' };

        // Phân tích cầu hiện tại
        let cauHienTai = [];
        let cauTai = 0;
        let cauXiu = 0;
        
        for (let i = size - 1; i >= 0; i--) {
            if (cauHienTai.length === 0) {
                cauHienTai.push(this.data[i].side);
                if (this.data[i].side === 'TAI') cauTai++;
                else cauXiu++;
            } else {
                if (this.data[i].side === cauHienTai[0]) {
                    cauHienTai.push(this.data[i].side);
                    if (this.data[i].side === 'TAI') cauTai++;
                    else cauXiu++;
                } else {
                    break;
                }
            }
        }

        // Đếm tổng Tài/Xỉu trong toàn bộ dữ liệu
        let tongTai = 0;
        let tongXiu = 0;
        this.data.forEach(d => {
            if (d.side === 'TAI') tongTai++;
            else tongXiu++;
        });

        // Cân bằng - không thiên vị
        const tyLeTai = tongTai / size;
        const tyLeXiu = tongXiu / size;
        
        let duDoan = 'CAN_BANG';
        let doTinCay = 0;
        
        // Chỉ dự đoán khi có sự chênh lệch rõ ràng
        if (Math.abs(tyLeTai - tyLeXiu) > 0.15) {
            duDoan = tyLeTai > tyLeXiu ? 'TAI' : 'XIU';
            doTinCay = Math.abs(tyLeTai - tyLeXiu);
        }

        this.cauPhatHien = {
            cauHienTai: cauHienTai.reverse(),
            doDaiCau: cauHienTai.length,
            loaiCau: this.xacDinhLoaiCau(cauHienTai),
            tongTai: tongTai,
            tongXiu: tongXiu,
            tyLeTai: tyLeTai,
            tyLeXiu: tyLeXiu,
            duDoan: duDoan,
            doTinCay: doTinCay
        };

        return this.cauPhatHien;
    }

    xacDinhLoaiCau(cau) {
        if (cau.length < 2) return 'CHUA_XAC_DINH';
        const first = cau[0];
        const isSame = cau.every(s => s === first);
        if (isSame) return 'CAU_DON';
        
        let isAlternate = true;
        for (let i = 1; i < cau.length; i++) {
            if (cau[i] === cau[i-1]) {
                isAlternate = false;
                break;
            }
        }
        if (isAlternate) return 'CAU_DAN_XEN';
        
        return 'CAU_PHOI_HOP';
    }
}

// ============================================================================
// THUẬT TOÁN CON 2: PHÂN TÍCH CẦU (CÂN BẰNG)
// ============================================================================
class CauPhanTich {
    constructor(data, cauInfo) {
        this.data = data;
        this.cauInfo = cauInfo;
        this.ketQua = {};
    }

    phanTich() {
        const size = this.data.length;
        if (size < 10) return {};

        // Phân tích tần suất
        const tanSuat = { TAI: 0, XIU: 0 };
        this.data.forEach(d => {
            tanSuat[d.side] = (tanSuat[d.side] || 0) + 1;
        });

        // Phân tích cầu dài nhất
        let maxStreakTai = 0;
        let maxStreakXiu = 0;
        let currentStreakTai = 0;
        let currentStreakXiu = 0;

        for (let i = 0; i < size; i++) {
            if (this.data[i].side === 'TAI') {
                currentStreakTai++;
                currentStreakXiu = 0;
                maxStreakTai = Math.max(maxStreakTai, currentStreakTai);
            } else {
                currentStreakXiu++;
                currentStreakTai = 0;
                maxStreakXiu = Math.max(maxStreakXiu, currentStreakXiu);
            }
        }

        // Phân tích xu hướng
        let xuHuong = 0;
        for (let i = 1; i < Math.min(20, size); i++) {
            if (this.data[size - i].side === this.data[size - i - 1].side) {
                xuHuong++;
            } else {
                xuHuong--;
            }
        }

        // Cân bằng - đánh giá khách quan
        const chenhLech = Math.abs(tanSuat.TAI - tanSuat.XIU) / size;
        const doOnDinh = 1 - (Math.abs(maxStreakTai - maxStreakXiu) / Math.max(size, 1));

        let duDoan = 'CAN_BANG';
        if (chenhLech > 0.2) {
            duDoan = tanSuat.TAI > tanSuat.XIU ? 'TAI' : 'XIU';
        }

        this.ketQua = {
            tanSuat: tanSuat,
            tyLeTai: tanSuat.TAI / size,
            tyLeXiu: tanSuat.XIU / size,
            maxStreakTai: maxStreakTai,
            maxStreakXiu: maxStreakXiu,
            xuHuong: xuHuong,
            chenhLech: chenhLech,
            doOnDinh: doOnDinh,
            duDoan: duDoan
        };

        return this.ketQua;
    }
}

// ============================================================================
// THUẬT TOÁN CON 3: ĐỐI CHIẾU CẦU (CÂN BẰNG)
// ============================================================================
class CauDoiChieu {
    constructor(data) {
        this.data = data;
    }

    doiChieu() {
        const size = this.data.length;
        if (size < 20) return {};

        // So sánh các khung thời gian
        const khung = [5, 10, 15, 20, 30];
        const ketQua = {};

        khung.forEach(k => {
            if (size >= k) {
                const dataKhung = this.data.slice(-k);
                const tai = dataKhung.filter(d => d.side === 'TAI').length;
                const xiu = dataKhung.filter(d => d.side === 'XIU').length;
                ketQua[`khung_${k}`] = {
                    tai: tai,
                    xiu: xiu,
                    tyLeTai: tai / k,
                    tyLeXiu: xiu / k,
                    chenhLech: Math.abs(tai - xiu) / k
                };
            }
        });

        // So sánh với tổng thể
        const tongTai = this.data.filter(d => d.side === 'TAI').length;
        const tongXiu = this.data.filter(d => d.side === 'XIU').length;
        const tyLeTaiTong = tongTai / size;
        const tyLeXiuTong = tongXiu / size;

        // Đánh giá xu hướng
        let xuHuong = 'CAN_BANG';
        let doTinCay = 0;

        if (ketQua.khung_10 && ketQua.khung_20) {
            const chenhLech10 = ketQua.khung_10.chenhLech;
            const chenhLech20 = ketQua.khung_20.chenhLech;
            
            if (chenhLech10 > 0.3 && chenhLech10 > chenhLech20 * 1.2) {
                xuHuong = ketQua.khung_10.tai > ketQua.khung_10.xiu ? 'TAI' : 'XIU';
                doTinCay = chenhLech10;
            }
        }

        return {
            ketQuaKhung: ketQua,
            tongTai: tongTai,
            tongXiu: tongXiu,
            tyLeTaiTong: tyLeTaiTong,
            tyLeXiuTong: tyLeXiuTong,
            xuHuong: xuHuong,
            doTinCay: doTinCay
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 4: KIỂM TRA CẦU (CÂN BẰNG)
// ============================================================================
class CauKiemTra {
    constructor(data) {
        this.data = data;
    }

    kiemTra() {
        const size = this.data.length;
        if (size < 20) return {};

        // Kiểm tra độ tin cậy
        let dungTai = 0;
        let dungXiu = 0;
        let tongKiemTra = 0;

        for (let i = 2; i < size; i++) {
            const truoc = this.data[i-2].side;
            const giua = this.data[i-1].side;
            const sau = this.data[i].side;

            // Dự đoán đơn giản: nếu 2 phiên trước cùng loại
            if (truoc === giua) {
                tongKiemTra++;
                if (sau === truoc) {
                    if (sau === 'TAI') dungTai++;
                    else dungXiu++;
                }
            }
        }

        // Đánh giá độ chính xác
        const doChinhXac = tongKiemTra > 0 ? (dungTai + dungXiu) / tongKiemTra : 0;
        const doChinhXacTai = tongKiemTra > 0 ? dungTai / tongKiemTra : 0;
        const doChinhXacXiu = tongKiemTra > 0 ? dungXiu / tongKiemTra : 0;

        // Kiểm tra phân phối
        const phanPhoi = { TAI: 0, XIU: 0 };
        this.data.forEach(d => {
            phanPhoi[d.side]++;
        });

        const canBang = Math.abs(phanPhoi.TAI - phanPhoi.XIU) / size;

        return {
            doChinhXac: doChinhXac,
            doChinhXacTai: doChinhXacTai,
            doChinhXacXiu: doChinhXacXiu,
            tongKiemTra: tongKiemTra,
            phanPhoi: phanPhoi,
            canBang: canBang,
            danhGia: canBang < 0.15 ? 'CAN_BANG' : (phanPhoi.TAI > phanPhoi.XIU ? 'THIEN_TAI' : 'THIEN_XIU')
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 5: HỌC CẦU (CÂN BẰNG)
// ============================================================================
class CauHoc {
    constructor(data) {
        this.data = data;
        this.mauHoc = {};
    }

    hoc() {
        const size = this.data.length;
        if (size < 30) return {};

        // Học mẫu 3 phiên
        const mau3 = {};
        for (let i = 0; i < size - 3; i++) {
            const key = `${this.data[i].side}-${this.data[i+1].side}-${this.data[i+2].side}`;
            if (!mau3[key]) {
                mau3[key] = { tai: 0, xiu: 0, tong: 0 };
            }
            if (this.data[i+2].side === 'TAI') mau3[key].tai++;
            else mau3[key].xiu++;
            mau3[key].tong++;
        }

        // Học mẫu 4 phiên
        const mau4 = {};
        for (let i = 0; i < size - 4; i++) {
            const key = `${this.data[i].side}-${this.data[i+1].side}-${this.data[i+2].side}-${this.data[i+3].side}`;
            if (!mau4[key]) {
                mau4[key] = { tai: 0, xiu: 0, tong: 0 };
            }
            if (this.data[i+3].side === 'TAI') mau4[key].tai++;
            else mau4[key].xiu++;
            mau4[key].tong++;
        }

        // Tìm mẫu hiện tại
        const cauHienTai3 = this.data.slice(-3).map(d => d.side).join('-');
        const cauHienTai4 = this.data.slice(-4).map(d => d.side).join('-');

        let duDoan3 = null;
        let duDoan4 = null;

        if (mau3[cauHienTai3]) {
            const m = mau3[cauHienTai3];
            duDoan3 = m.tai > m.xiu ? 'TAI' : (m.xiu > m.tai ? 'XIU' : 'CAN_BANG');
        }

        if (mau4[cauHienTai4]) {
            const m = mau4[cauHienTai4];
            duDoan4 = m.tai > m.xiu ? 'TAI' : (m.xiu > m.tai ? 'XIU' : 'CAN_BANG');
        }

        // Cân bằng kết quả
        let duDoan = 'CAN_BANG';
        let doTinCay = 0;

        if (duDoan3 && duDoan4) {
            if (duDoan3 === duDoan4 && duDoan3 !== 'CAN_BANG') {
                duDoan = duDoan3;
                doTinCay = 0.7;
            }
        } else if (duDoan3 && duDoan3 !== 'CAN_BANG') {
            duDoan = duDoan3;
            doTinCay = 0.5;
        } else if (duDoan4 && duDoan4 !== 'CAN_BANG') {
            duDoan = duDoan4;
            doTinCay = 0.5;
        }

        this.mauHoc = {
            mau3: mau3,
            mau4: mau4,
            duDoan: duDoan,
            doTinCay: doTinCay
        };

        return this.mauHoc;
    }
}

// ============================================================================
// THUẬT TOÁN CON 6: PHÂN TÍCH XUẤT (CÂN BẰNG)
// ============================================================================
class PhanTichXuat {
    constructor(data) {
        this.data = data;
    }

    phanTich() {
        const size = this.data.length;
        if (size < 20) return {};

        // Phân tích khoảng cách xuất hiện
        let viTriTai = [];
        let viTriXiu = [];

        this.data.forEach((d, index) => {
            if (d.side === 'TAI') viTriTai.push(index);
            else viTriXiu.push(index);
        });

        // Khoảng cách trung bình
        let khoangCachTai = [];
        let khoangCachXiu = [];

        for (let i = 1; i < viTriTai.length; i++) {
            khoangCachTai.push(viTriTai[i] - viTriTai[i-1]);
        }
        for (let i = 1; i < viTriXiu.length; i++) {
            khoangCachXiu.push(viTriXiu[i] - viTriXiu[i-1]);
        }

        const avgKhoangCachTai = khoangCachTai.length > 0 ? 
            khoangCachTai.reduce((s, c) => s + c, 0) / khoangCachTai.length : 0;
        const avgKhoangCachXiu = khoangCachXiu.length > 0 ? 
            khoangCachXiu.reduce((s, c) => s + c, 0) / khoangCachXiu.length : 0;

        // Dự đoán xuất tiếp theo
        let duDoan = 'CAN_BANG';
        let doTinCay = 0;

        if (avgKhoangCachTai > 0 && avgKhoangCachXiu > 0) {
            const lastTai = viTriTai[viTriTai.length - 1];
            const lastXiu = viTriXiu[viTriXiu.length - 1];
            const currentPos = size - 1;

            const nextTai = lastTai + avgKhoangCachTai;
            const nextXiu = lastXiu + avgKhoangCachXiu;

            const distanceToTai = nextTai - currentPos;
            const distanceToXiu = nextXiu - currentPos;

            if (distanceToTai < distanceToXiu && distanceToTai > 0) {
                duDoan = 'TAI';
                doTinCay = 1 - (distanceToTai / Math.max(avgKhoangCachTai, avgKhoangCachXiu));
            } else if (distanceToXiu < distanceToTai && distanceToXiu > 0) {
                duDoan = 'XIU';
                doTinCay = 1 - (distanceToXiu / Math.max(avgKhoangCachTai, avgKhoangCachXiu));
            }
        }

        return {
            soLuongTai: viTriTai.length,
            soLuongXiu: viTriXiu.length,
            avgKhoangCachTai: avgKhoangCachTai,
            avgKhoangCachXiu: avgKhoangCachXiu,
            duDoan: duDoan,
            doTinCay: doTinCay
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 7: PHÂN TÍCH ĐIỂM RƠI (CÂN BẰNG)
// ============================================================================
class PhanTichDiemRoi {
    constructor(data) {
        this.data = data;
    }

    phanTich() {
        const size = this.data.length;
        if (size < 20) return {};

        // Phân tích tổng điểm
        const tongDiem = this.data.map(d => d.total);
        const avg = tongDiem.reduce((s, c) => s + c, 0) / size;
        
        // Phân phối điểm
        const phanPhoiDiem = {};
        for (let i = 3; i <= 18; i++) {
            phanPhoiDiem[i] = 0;
        }
        this.data.forEach(d => {
            phanPhoiDiem[d.total] = (phanPhoiDiem[d.total] || 0) + 1;
        });

        // Tìm điểm xuất hiện nhiều
        let maxCount = 0;
        let maxDiem = 3;
        for (let i = 3; i <= 18; i++) {
            if (phanPhoiDiem[i] > maxCount) {
                maxCount = phanPhoiDiem[i];
                maxDiem = i;
            }
        }

        // Phân tích xu hướng điểm
        let xuHuongDiem = 0;
        for (let i = 1; i < Math.min(15, size); i++) {
            xuHuongDiem += this.data[size - i].total - this.data[size - i - 1].total;
        }
        xuHuongDiem = xuHuongDiem / Math.min(15, size);

        // Dự đoán điểm tiếp theo
        const lastTotal = this.data[size - 1].total;
        let duDoanDiem = Math.round(lastTotal + xuHuongDiem);
        duDoanDiem = Math.max(3, Math.min(18, duDoanDiem));

        // Chuyển đổi điểm thành Tài/Xỉu (cân bằng)
        let duDoan = 'CAN_BANG';
        if (duDoanDiem >= 11) duDoan = 'TAI';
        else if (duDoanDiem <= 10) duDoan = 'XIU';

        return {
            avgDiem: avg,
            maxDiem: maxDiem,
            maxCount: maxCount,
            xuHuongDiem: xuHuongDiem,
            duDoanDiem: duDoanDiem,
            duDoan: duDoan
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 8: PHÂN TÍCH CHUẨN (CÂN BẰNG)
// ============================================================================
class PhanTichChuan {
    constructor(data) {
        this.data = data;
    }

    phanTich() {
        const size = this.data.length;
        if (size < 30) return {};

        // Thống kê cơ bản
        const tongDiem = this.data.map(d => d.total);
        const trungBinh = tongDiem.reduce((s, c) => s + c, 0) / size;
        
        // Phương sai và độ lệch chuẩn
        const phuongSai = tongDiem.reduce((s, c) => s + Math.pow(c - trungBinh, 2), 0) / size;
        const doLechChuan = Math.sqrt(phuongSai);

        // Phân phối chuẩn
        const phanPhoi = {};
        for (let i = 3; i <= 18; i++) {
            phanPhoi[i] = 0;
        }
        this.data.forEach(d => {
            phanPhoi[d.total] = (phanPhoi[d.total] || 0) + 1;
        });

        // Đánh giá độ lệch
        let lechTai = 0;
        let lechXiu = 0;
        for (let i = 3; i <= 10; i++) {
            lechXiu += phanPhoi[i];
        }
        for (let i = 11; i <= 18; i++) {
            lechTai += phanPhoi[i];
        }

        const tyLeTai = lechTai / size;
        const tyLeXiu = lechXiu / size;
        const chenhLech = Math.abs(tyLeTai - tyLeXiu);

        let duDoan = 'CAN_BANG';
        if (chenhLech > 0.2) {
            duDoan = tyLeTai > tyLeXiu ? 'TAI' : 'XIU';
        }

        return {
            trungBinh: trungBinh,
            doLechChuan: doLechChuan,
            tyLeTai: tyLeTai,
            tyLeXiu: tyLeXiu,
            chenhLech: chenhLech,
            duDoan: duDoan,
            doOnDinh: 1 - (doLechChuan / trungBinh)
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 9: PHÂN TÍCH ALL CẦU (CÂN BẰNG)
// ============================================================================
class PhanTichAllCau {
    constructor(data) {
        this.data = data;
    }

    phanTich() {
        const size = this.data.length;
        if (size < 30) return {};

        // Phân tích tất cả cầu
        const cauTai = [];
        const cauXiu = [];
        let cauHienTai = [];

        for (let i = 0; i < size; i++) {
            if (i === 0) {
                cauHienTai.push(this.data[i].side);
            } else {
                if (this.data[i].side === this.data[i-1].side) {
                    cauHienTai.push(this.data[i].side);
                } else {
                    if (cauHienTai[0] === 'TAI') {
                        cauTai.push(cauHienTai.length);
                    } else {
                        cauXiu.push(cauHienTai.length);
                    }
                    cauHienTai = [this.data[i].side];
                }
            }
        }

        // Thêm cầu cuối cùng
        if (cauHienTai.length > 0) {
            if (cauHienTai[0] === 'TAI') {
                cauTai.push(cauHienTai.length);
            } else {
                cauXiu.push(cauHienTai.length);
            }
        }

        // Thống kê
        const avgCauTai = cauTai.length > 0 ? 
            cauTai.reduce((s, c) => s + c, 0) / cauTai.length : 0;
        const avgCauXiu = cauXiu.length > 0 ? 
            cauXiu.reduce((s, c) => s + c, 0) / cauXiu.length : 0;

        const maxCauTai = cauTai.length > 0 ? Math.max(...cauTai) : 0;
        const maxCauXiu = cauXiu.length > 0 ? Math.max(...cauXiu) : 0;

        // Cân bằng đánh giá
        let duDoan = 'CAN_BANG';
        let doTinCay = 0;

        const chenhLechDoDai = Math.abs(avgCauTai - avgCauXiu);
        if (chenhLechDoDai > 1.5) {
            duDoan = avgCauTai > avgCauXiu ? 'TAI' : 'XIU';
            doTinCay = Math.min(chenhLechDoDai / 3, 1);
        }

        return {
            soCauTai: cauTai.length,
            soCauXiu: cauXiu.length,
            avgCauTai: avgCauTai,
            avgCauXiu: avgCauXiu,
            maxCauTai: maxCauTai,
            maxCauXiu: maxCauXiu,
            duDoan: duDoan,
            doTinCay: doTinCay
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 10: PHÂN TÍCH DỮ LIỆU THIẾU (CÂN BẰNG)
// ============================================================================
class PhanTichThieu {
    constructor(data) {
        this.data = data;
    }

    phanTich() {
        const size = this.data.length;
        if (size < 10) return {};

        // Kiểm tra dữ liệu thiếu
        let phienThieu = 0;
        let khoangTrong = [];

        for (let i = 1; i < size; i++) {
            const khoangCach = this.data[i].id - this.data[i-1].id;
            if (khoangCach > 1) {
                phienThieu += khoangCach - 1;
                khoangTrong.push({
                    tu: this.data[i-1].id,
                    den: this.data[i].id,
                    soLuong: khoangCach - 1
                });
            }
        }

        const tyLeThieu = (size + phienThieu) > 0 ? 
            phienThieu / (size + phienThieu) : 0;

        // Đánh giá chất lượng
        const chatLuong = 1 - tyLeThieu;

        // Điều chỉnh độ tin cậy
        let dieuChinh = 0;
        if (chatLuong < 0.7) {
            dieuChinh = -0.2;
        } else if (chatLuong > 0.9) {
            dieuChinh = 0.1;
        }

        return {
            phienThieu: phienThieu,
            khoangTrong: khoangTrong,
            tyLeThieu: tyLeThieu,
            chatLuong: chatLuong,
            dieuChinh: dieuChinh
        };
    }
}

// ============================================================================
// THUẬT TOÁN CHÍNH: TỔNG HỢP CÂN BẰNG
// ============================================================================
class ThuatToanChinh {
    constructor(historyData) {
        this.rawData = historyData;
        this.processedData = [];
        this.ketQua = {};
        this.initialize();
    }

    initialize() {
        this.processData();
        this.tongHopKhongThienVi();
    }

    processData() {
        const cleanData = this.rawData.filter(item => {
            const d1 = parseInt(item.Xuc_cac_1 || item.Xuc_xac_1 || 0);
            const d2 = parseInt(item.Xuc_cac_2 || item.Xuc_xac_2 || 0);
            const d3 = parseInt(item.Xuc_cac_3 || item.Xuc_xac_3 || 0);
            return (d1 + d2 + d3) > 0;
        });

        this.processedData = cleanData.slice(-150).reverse().map(item => {
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

    tongHopKhongThienVi() {
        const data = this.processedData;
        const size = data.length;

        if (size < 10) {
            this.ketQua = {
                prediction: 'XIU',
                rate: 50,
                cau: 'CHUA_DU_DU_LIEU'
            };
            return;
        }

        // === THỰC HIỆN 10 THUẬT TOÁN CON ===
        const nhanDien = new CauNhanDien(data);
        const ketQua1 = nhanDien.nhanDien();

        const phanTichCau = new CauPhanTich(data, ketQua1);
        const ketQua2 = phanTichCau.phanTich();

        const doiChieu = new CauDoiChieu(data);
        const ketQua3 = doiChieu.doiChieu();

        const kiemTra = new CauKiemTra(data);
        const ketQua4 = kiemTra.kiemTra();

        const hocCau = new CauHoc(data);
        const ketQua5 = hocCau.hoc();

        const phanTichXuat = new PhanTichXuat(data);
        const ketQua6 = phanTichXuat.phanTich();

        const diemRoi = new PhanTichDiemRoi(data);
        const ketQua7 = diemRoi.phanTich();

        const chuan = new PhanTichChuan(data);
        const ketQua8 = chuan.phanTich();

        const allCau = new PhanTichAllCau(data);
        const ketQua9 = allCau.phanTich();

        const thieu = new PhanTichThieu(data);
        const ketQua10 = thieu.phanTich();

        // === TỔNG HỢP KHÔNG THIÊN VỊ ===
        let demTai = 0;
        let demXiu = 0;
        let trongSoTai = 0;
        let trongSoXiu = 0;
        let cacYeuTo = [];

        // Hàm cộng điểm cân bằng
        const congDiem = (duDoan, trongSo, moTa) => {
            if (duDoan === 'TAI') {
                demTai++;
                trongSoTai += trongSo;
                cacYeuTo.push(`${moTa} (Tài)`);
            } else if (duDoan === 'XIU') {
                demXiu++;
                trongSoXiu += trongSo;
                cacYeuTo.push(`${moTa} (Xỉu)`);
            } else {
                // CAN_BANG - không cộng điểm
                cacYeuTo.push(`${moTa} (Cân bằng)`);
            }
        };

        // Thuật toán 1: Nhận diện cầu
        if (ketQua1.duDoan !== 'CAN_BANG') {
            congDiem(ketQua1.duDoan, ketQua1.doTinCay * 2, 'Nhận diện cầu');
        }

        // Thuật toán 2: Phân tích cầu
        if (ketQua2.duDoan !== 'CAN_BANG') {
            const trongSo = Math.min(ketQua2.chenhLech * 3, 1.5);
            congDiem(ketQua2.duDoan, trongSo, 'Phân tích cầu');
        }

        // Thuật toán 3: Đối chiếu
        if (ketQua3.xuHuong !== 'CAN_BANG') {
            congDiem(ketQua3.xuHuong, ketQua3.doTinCay * 1.5, 'Đối chiếu cầu');
        }

        // Thuật toán 4: Kiểm tra
        if (ketQua4.danhGia !== 'CAN_BANG') {
            const duDoan = ketQua4.danhGia === 'THIEN_TAI' ? 'TAI' : 'XIU';
            const trongSo = Math.min(ketQua4.canBang * 2, 1.5);
            congDiem(duDoan, trongSo, 'Kiểm tra cầu');
        }

        // Thuật toán 5: Học cầu
        if (ketQua5.duDoan !== 'CAN_BANG') {
            congDiem(ketQua5.duDoan, ketQua5.doTinCay * 1.5, 'Học cầu');
        }

        // Thuật toán 6: Phân tích xuất
        if (ketQua6.duDoan !== 'CAN_BANG') {
            congDiem(ketQua6.duDoan, ketQua6.doTinCay * 1.5, 'Phân tích xuất');
        }

        // Thuật toán 7: Điểm rơi
        if (ketQua7.duDoan !== 'CAN_BANG') {
            congDiem(ketQua7.duDoan, 1.2, 'Phân tích điểm rơi');
        }

        // Thuật toán 8: Chuẩn
        if (ketQua8.duDoan !== 'CAN_BANG') {
            const trongSo = Math.min(ketQua8.chenhLech * 3, 1.5);
            congDiem(ketQua8.duDoan, trongSo, 'Phân tích chuẩn');
        }

        // Thuật toán 9: All cầu
        if (ketQua9.duDoan !== 'CAN_BANG') {
            congDiem(ketQua9.duDoan, ketQua9.doTinCay * 1.5, 'Phân tích all cầu');
        }

        // Thuật toán 10: Dữ liệu thiếu
        if (ketQua10.dieuChinh !== 0) {
            // Điều chỉnh dựa trên chất lượng dữ liệu
            // Không thêm vào đếm, chỉ điều chỉnh tỉ lệ sau
        }

        // === QUYẾT ĐỊNH CUỐI CÙNG ===
        let prediction = 'XIU';
        let rate = 50;
        let cau = '';

        // Tính tổng trọng số
        const tongTrongSo = trongSoTai + trongSoXiu;

        if (tongTrongSo > 0) {
            const tyLeTai = trongSoTai / tongTrongSo;
            const tyLeXiu = trongSoXiu / tongTrongSo;
            
            // Chỉ dự đoán khi có sự chênh lệch đủ lớn
            const chenhLech = Math.abs(tyLeTai - tyLeXiu);
            
            if (chenhLech > 0.15) {
                if (tyLeTai > tyLeXiu) {
                    prediction = 'TAI';
                    rate = Math.min(50 + Math.round(chenhLech * 40), 82);
                } else {
                    prediction = 'XIU';
                    rate = Math.min(50 + Math.round(chenhLech * 40), 82);
                }
            } else {
                // Gần cân bằng - dùng thống kê tổng thể
                const taiCount = data.filter(d => d.side === 'TAI').length;
                const xiuCount = data.filter(d => d.side === 'XIU').length;
                const tyLeTaiTong = taiCount / size;
                const tyLeXiuTong = xiuCount / size;
                
                if (Math.abs(tyLeTaiTong - tyLeXiuTong) > 0.1) {
                    prediction = tyLeTaiTong > tyLeXiuTong ? 'TAI' : 'XIU';
                    rate = 54;
                } else {
                    // Thực sự cân bằng - dùng phiên cuối
                    const lastSide = data[size - 1].side;
                    prediction = lastSide;
                    rate = 52;
                    cacYeuTo.push('Cân bằng tuyệt đối - theo phiên cuối');
                }
            }
        } else {
            // Không có dữ liệu đủ tin cậy
            const taiCount = data.filter(d => d.side === 'TAI').length;
            const xiuCount = data.filter(d => d.side === 'XIU').length;
            prediction = taiCount > xiuCount ? 'TAI' : 'XIU';
            rate = 51;
            cacYeuTo.push('Dữ liệu không đủ - dùng thống kê cơ bản');
        }

        // Điều chỉnh theo chất lượng dữ liệu
        if (ketQua10.dieuChinh < 0) {
            rate = Math.max(rate - 5, 50);
            cacYeuTo.push(`Giảm tin cậy do dữ liệu thiếu ${Math.round(ketQua10.tyLeThieu * 100)}%`);
        }

        // Đảm bảo tỉ lệ trong khoảng hợp lý
        rate = Math.max(50, Math.min(rate, 82));

        // Tạo cầu
        cau = cacYeuTo.length > 0 ? cacYeuTo.slice(0, 4).join(' | ') : 'KHONG_CO_CAU';

        // Log chi tiết
        console.log(`[THUẬT TOÁN CHÍNH] Tài: ${demTai}, Xỉu: ${demXiu}, Pred: ${prediction}, Rate: ${rate}%`);
        console.log(`[CHI TIẾT] Trọng số Tài: ${trongSoTai.toFixed(2)}, Xỉu: ${trongSoXiu.toFixed(2)}`);

        this.ketQua = {
            prediction: prediction,
            rate: rate,
            cau: cau,
            chiTiet: {
                demTai: demTai,
                demXiu: demXiu,
                trongSoTai: trongSoTai,
                trongSoXiu: trongSoXiu,
                soYeuTo: cacYeuTo.length
            }
        };
    }

    getResults() {
        return this.ketQua || {
            prediction: 'XIU',
            rate: 50,
            cau: 'KHONG_CO_DU_LIEU'
        };
    }
}

// ============================================================================
// HÀM DỰ ĐOÁN CHÍNH
// ============================================================================

function executeUltraHardcoreLogicChain(historyData) {
    try {
        const thuatToan = new ThuatToanChinh(historyData);
        const results = thuatToan.getResults();
        
        return {
            prediction: results.prediction || "XIU",
            rate: `${results.rate || 53}%`,
            cau: results.cau || "KHONG_CO_CAU"
        };
    } catch (error) {
        console.error('Lỗi thuật toán chính:', error);
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

        const logicResult = executeUltraHardcoreLogicChain(history);
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
    res.send("HỆ THỐNG 10 THUẬT TOÁN CON CÂN BẰNG - KHÔNG THIÊN VỊ");
});

app.listen(PORT, () => {
    console.log(`[ONLINE] Hệ thống cân bằng tuyệt đối đã sẵn sàng trên cổng: ${PORT}`);
});
