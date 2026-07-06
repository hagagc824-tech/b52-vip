const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============================================================================
// THUẬT TOÁN SIÊU CẤP VIP PRO - HỆ THỐNG 10 THUẬT TOÁN CON + 1 THUẬT TOÁN CHÍNH
// PHÂN TÍCH ĐA CHIỀU - KHÔNG RANDOM - DỰA TRÊN DỮ LIỆU THỰC TẾ 100%
// ============================================================================

// ============================================================================
// THUẬT TOÁN CON 1: NHẬN DIỆN CẦU
// ============================================================================
class CauNhanDien {
    constructor(data) {
        this.data = data;
        this.cauPhatHien = [];
    }

    nhanDien() {
        const size = this.data.length;
        if (size < 10) return [];

        // Nhận diện cầu Tài/Xỉu
        let cauHienTai = [];
        let cauDangChay = [];
        let cauDaiNhat = [];

        for (let i = 0; i < size; i++) {
            const side = this.data[i].side;
            
            if (i === 0) {
                cauHienTai = [side];
            } else {
                if (side === this.data[i-1].side) {
                    cauHienTai.push(side);
                } else {
                    if (cauHienTai.length > 1) {
                        cauDangChay.push([...cauHienTai]);
                        if (cauHienTai.length > cauDaiNhat.length) {
                            cauDaiNhat = [...cauHienTai];
                        }
                    }
                    cauHienTai = [side];
                }
            }
        }

        // Lưu cầu cuối cùng
        if (cauHienTai.length > 1) {
            cauDangChay.push([...cauHienTai]);
            if (cauHienTai.length > cauDaiNhat.length) {
                cauDaiNhat = [...cauHienTai];
            }
        }

        // Phân tích cầu
        const cauPhanTich = {
            cauHienTai: cauHienTai,
            cauDangChay: cauDangChay,
            cauDaiNhat: cauDaiNhat,
            soLuongCau: cauDangChay.length,
            cauCuoiCung: cauHienTai.length > 0 ? cauHienTai[0] : null,
            doDaiCauHienTai: cauHienTai.length,
            loaiCau: this.xacDinhLoaiCau(cauHienTai)
        };

        this.cauPhatHien = cauPhanTich;
        return cauPhanTich;
    }

    xacDinhLoaiCau(cau) {
        if (cau.length < 2) return 'CHUA_XAC_DINH';
        const first = cau[0];
        const isSame = cau.every(s => s === first);
        if (isSame) return 'CAU_DON';
        
        // Kiểm tra cầu đan xen
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
// THUẬT TOÁN CON 2: PHÂN TÍCH CẦU
// ============================================================================
class CauPhanTich {
    constructor(data, cauInfo) {
        this.data = data;
        this.cauInfo = cauInfo;
        this.ketQuaPhanTich = {};
    }

    phanTich() {
        const size = this.data.length;
        if (size < 10) return {};

        // Phân tích tần suất xuất hiện của cầu
        const tanSuatCau = {};
        for (let i = 0; i < size - 1; i++) {
            const key = `${this.data[i].side}-${this.data[i+1].side}`;
            tanSuatCau[key] = (tanSuatCau[key] || 0) + 1;
        }

        // Phân tích độ dài cầu trung bình
        let tongDoDai = 0;
        let soCau = 0;
        let doDaiHienTai = 1;
        
        for (let i = 1; i < size; i++) {
            if (this.data[i].side === this.data[i-1].side) {
                doDaiHienTai++;
            } else {
                tongDoDai += doDaiHienTai;
                soCau++;
                doDaiHienTai = 1;
            }
        }
        tongDoDai += doDaiHienTai;
        soCau++;

        // Phân tích xác suất cầu tiếp theo
        const cauHienTai = this.cauInfo.cauHienTai;
        const doDaiCauHienTai = cauHienTai.length;
        const sideHienTai = cauHienTai[0];

        // Thống kê cầu tương tự trong quá khứ
        let cauTuongTu = [];
        for (let i = 0; i <= size - doDaiCauHienTai - 1; i++) {
            let giongNhau = true;
            for (let j = 0; j < doDaiCauHienTai; j++) {
                if (this.data[i+j].side !== cauHienTai[j]) {
                    giongNhau = false;
                    break;
                }
            }
            if (giongNhau) {
                cauTuongTu.push(this.data[i + doDaiCauHienTai].side);
            }
        }

        // Dự đoán cầu tiếp theo
        let duDoan = null;
        let doTinCay = 0;
        if (cauTuongTu.length > 0) {
            const taiCount = cauTuongTu.filter(s => s === 'TAI').length;
            const xiuCount = cauTuongTu.filter(s => s === 'XIU').length;
            duDoan = taiCount > xiuCount ? 'TAI' : (xiuCount > taiCount ? 'XIU' : 'CAN_BANG');
            doTinCay = Math.max(taiCount, xiuCount) / cauTuongTu.length;
        }

        this.ketQuaPhanTich = {
            tanSuatCau: tanSuatCau,
            doDaiTrungBinh: tongDoDai / soCau,
            soCau: soCau,
            cauTuongTu: cauTuongTu,
            duDoanCauTiep: duDoan,
            doTinCayCau: doTinCay,
            doDaiCauHienTai: doDaiCauHienTai
        };

        return this.ketQuaPhanTich;
    }
}

// ============================================================================
// THUẬT TOÁN CON 3: ĐỐI CHIẾU CẦU
// ============================================================================
class CauDoiChieu {
    constructor(data, cauInfo, phanTichCau) {
        this.data = data;
        this.cauInfo = cauInfo;
        this.phanTichCau = phanTichCau;
    }

    doiChieu() {
        const size = this.data.length;
        if (size < 20) return {};

        // Đối chiếu với dữ liệu lịch sử
        const lichSuCau = {};
        const cauHienTai = this.cauInfo.cauHienTai;
        const doDaiCau = cauHienTai.length;

        // Tìm các cầu tương tự trong 100 phiên gần nhất
        const cauTrungKhop = [];
        const startIndex = Math.max(0, size - 100);
        
        for (let i = startIndex; i <= size - doDaiCau - 1; i++) {
            let khop = true;
            for (let j = 0; j < doDaiCau; j++) {
                if (this.data[i+j].side !== cauHienTai[j]) {
                    khop = false;
                    break;
                }
            }
            if (khop) {
                cauTrungKhop.push({
                    viTri: i,
                    ketQuaTiep: this.data[i + doDaiCau].side,
                    tongTiep: this.data[i + doDaiCau].total
                });
            }
        }

        // Thống kê kết quả sau cầu trùng khớp
        let taiSauCau = 0;
        let xiuSauCau = 0;
        let tongTrungBinh = 0;
        
        cauTrungKhop.forEach(item => {
            if (item.ketQuaTiep === 'TAI') taiSauCau++;
            else xiuSauCau++;
            tongTrungBinh += item.tongTiep;
        });

        const tyLeTai = cauTrungKhop.length > 0 ? taiSauCau / cauTrungKhop.length : 0;
        const tyLeXiu = cauTrungKhop.length > 0 ? xiuSauCau / cauTrungKhop.length : 0;
        tongTrungBinh = cauTrungKhop.length > 0 ? tongTrungBinh / cauTrungKhop.length : 0;

        return {
            cauTrungKhop: cauTrungKhop,
            soLanTrungKhop: cauTrungKhop.length,
            tyLeTaiSauCau: tyLeTai,
            tyLeXiuSauCau: tyLeXiu,
            tongTrungBinhSauCau: tongTrungBinh,
            duDoan: tyLeTai > tyLeXiu ? 'TAI' : (tyLeXiu > tyLeTai ? 'XIU' : 'CAN_BANG')
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 4: KIỂM TRA CẦU
// ============================================================================
class CauKiemTra {
    constructor(data, cauInfo) {
        this.data = data;
        this.cauInfo = cauInfo;
    }

    kiemTra() {
        const size = this.data.length;
        if (size < 10) return {};

        const cauHienTai = this.cauInfo.cauHienTai;
        const doDaiCau = cauHienTai.length;

        // Kiểm tra độ tin cậy của cầu
        let doTinCay = 0;
        let doChinhXac = 0;
        let tyLeThang = 0;

        // Kiểm tra các thông số
        const tanSuatXuatHien = {};
        for (let i = 0; i < size - 1; i++) {
            const key = `${this.data[i].side}-${this.data[i+1].side}`;
            tanSuatXuatHien[key] = (tanSuatXuatHien[key] || 0) + 1;
        }

        // Kiểm tra cầu hiện tại
        let kiemTraCau = [];
        for (let i = 0; i < size - doDaiCau; i++) {
            let khop = true;
            for (let j = 0; j < doDaiCau; j++) {
                if (this.data[i+j].side !== cauHienTai[j]) {
                    khop = false;
                    break;
                }
            }
            if (khop) {
                kiemTraCau.push({
                    viTri: i,
                    ketQua: this.data[i + doDaiCau].side,
                    tong: this.data[i + doDaiCau].total
                });
            }
        }

        // Đánh giá độ tin cậy
        if (kiemTraCau.length > 0) {
            const dung = kiemTraCau.filter(k => {
                const duDoan = k.ketQua === 'TAI' ? 'TAI' : 'XIU';
                return duDoan === k.ketQua;
            }).length;
            doChinhXac = dung / kiemTraCau.length;
            
            const taiCount = kiemTraCau.filter(k => k.ketQua === 'TAI').length;
            const xiuCount = kiemTraCau.filter(k => k.ketQua === 'XIU').length;
            tyLeThang = Math.max(taiCount, xiuCount) / kiemTraCau.length;
            doTinCay = (doChinhXac + tyLeThang) / 2;
        }

        // Kiểm tra độ ổn định
        let doOnDinh = 0;
        if (kiemTraCau.length > 1) {
            let bienDong = 0;
            for (let i = 1; i < kiemTraCau.length; i++) {
                bienDong += Math.abs(kiemTraCau[i].tong - kiemTraCau[i-1].tong);
            }
            doOnDinh = 1 - (bienDong / (kiemTraCau.length - 1) / 6);
        }

        return {
            doTinCay: doTinCay,
            doChinhXac: doChinhXac,
            tyLeThang: tyLeThang,
            doOnDinh: doOnDinh,
            soLanKiemTra: kiemTraCau.length,
            kiemTraCau: kiemTraCau,
            danhGia: doTinCay > 0.7 ? 'CAU_MANH' : (doTinCay > 0.5 ? 'CAU_TRUNG_BINH' : 'CAU_YEU')
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 5: HỌC CẦU
// ============================================================================
class CauHoc {
    constructor(data) {
        this.data = data;
        this.mauHoc = [];
        this.mauDuDoan = [];
    }

    hoc() {
        const size = this.data.length;
        if (size < 30) return {};

        // Học các mẫu cầu
        const doDaiMau = [3, 4, 5, 6];
        const mauHoc = {};

        doDaiMau.forEach(doDai => {
            const mau = {};
            for (let i = 0; i <= size - doDai - 1; i++) {
                const key = this.data.slice(i, i + doDai).map(d => d.side).join('-');
                const next = this.data[i + doDai].side;
                if (!mau[key]) {
                    mau[key] = { tai: 0, xiu: 0, tong: 0 };
                }
                if (next === 'TAI') mau[key].tai++;
                else mau[key].xiu++;
                mau[key].tong++;
            }
            mauHoc[`doDai_${doDai}`] = mau;
        });

        // Học các quy luật
        const quyLuat = {};
        for (let i = 2; i < size; i++) {
            const key = `${this.data[i-2].side}-${this.data[i-1].side}-${this.data[i].side}`;
            if (!quyLuat[key]) quyLuat[key] = { tai: 0, xiu: 0 };
            if (this.data[i].side === 'TAI') quyLuat[key].tai++;
            else quyLuat[key].xiu++;
        }

        // Học từ dữ liệu mới nhất
        const cauHienTai = this.data.slice(-6).map(d => d.side);
        let duDoan = null;
        let doTinCay = 0;

        // Tìm mẫu phù hợp nhất
        for (let doDai = 3; doDai <= 6; doDai++) {
            if (cauHienTai.length >= doDai) {
                const key = cauHienTai.slice(-doDai).join('-');
                const mau = mauHoc[`doDai_${doDai}`];
                if (mau && mau[key]) {
                    const tyLeTai = mau[key].tai / mau[key].tong;
                    const tyLeXiu = mau[key].xiu / mau[key].tong;
                    if (Math.max(tyLeTai, tyLeXiu) > doTinCay) {
                        doTinCay = Math.max(tyLeTai, tyLeXiu);
                        duDoan = tyLeTai > tyLeXiu ? 'TAI' : 'XIU';
                    }
                }
            }
        }

        this.mauHoc = mauHoc;
        this.mauDuDoan = {
            duDoan: duDoan,
            doTinCay: doTinCay,
            soMauHoc: Object.keys(mauHoc).length
        };

        return this.mauDuDoan;
    }
}

// ============================================================================
// THUẬT TOÁN CON 6: PHÂN TÍCH CÁC XUẤT
// ============================================================================
class PhanTichXuat {
    constructor(data) {
        this.data = data;
    }

    phanTich() {
        const size = this.data.length;
        if (size < 20) return {};

        // Phân tích các xuất hiện của Tài/Xỉu
        const xuatHien = {
            tai: [],
            xiu: []
        };

        for (let i = 0; i < size; i++) {
            if (this.data[i].side === 'TAI') {
                xuatHien.tai.push(i);
            } else {
                xuatHien.xiu.push(i);
            }
        }

        // Khoảng cách giữa các lần xuất hiện
        const khoangCachTai = [];
        const khoangCachXiu = [];
        
        for (let i = 1; i < xuatHien.tai.length; i++) {
            khoangCachTai.push(xuatHien.tai[i] - xuatHien.tai[i-1]);
        }
        for (let i = 1; i < xuatHien.xiu.length; i++) {
            khoangCachXiu.push(xuatHien.xiu[i] - xuatHien.xiu[i-1]);
        }

        // Tính tần suất xuất hiện
        const tanSuatTai = xuatHien.tai.length / size;
        const tanSuatXiu = xuatHien.xiu.length / size;

        // Dự đoán lần xuất hiện tiếp theo
        let duDoanXuatTiep = null;
        let khoangCachTrungBinh = 0;

        if (khoangCachTai.length > 0 && khoangCachXiu.length > 0) {
            const avgTai = khoangCachTai.reduce((s, c) => s + c, 0) / khoangCachTai.length;
            const avgXiu = khoangCachXiu.reduce((s, c) => s + c, 0) / khoangCachXiu.length;
            
            const lastTai = xuatHien.tai[xuatHien.tai.length - 1];
            const lastXiu = xuatHien.xiu[xuatHien.xiu.length - 1];
            const currentPos = size - 1;

            const nextTai = lastTai + avgTai;
            const nextXiu = lastXiu + avgXiu;
            
            duDoanXuatTiep = nextTai < nextXiu ? 'TAI' : 'XIU';
            khoangCachTrungBinh = (avgTai + avgXiu) / 2;
        }

        return {
            tongXuatTai: xuatHien.tai.length,
            tongXuatXiu: xuatHien.xiu.length,
            tanSuatTai: tanSuatTai,
            tanSuatXiu: tanSuatXiu,
            khoangCachTai: khoangCachTai,
            khoangCachXiu: khoangCachXiu,
            duDoanXuatTiep: duDoanXuatTiep,
            khoangCachTrungBinh: khoangCachTrungBinh
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 7: PHÂN TÍCH ĐIỂM RƠI
// ============================================================================
class PhanTichDiemRoi {
    constructor(data) {
        this.data = data;
    }

    phanTich() {
        const size = this.data.length;
        if (size < 10) return {};

        // Phân tích điểm rơi của tổng điểm
        const diemRoi = {};
        for (let i = 3; i <= 18; i++) {
            diemRoi[i] = 0;
        }

        this.data.forEach(d => {
            diemRoi[d.total] = (diemRoi[d.total] || 0) + 1;
        });

        // Tìm điểm rơi nhiều nhất
        let maxCount = 0;
        let maxDiem = 3;
        for (let i = 3; i <= 18; i++) {
            if (diemRoi[i] > maxCount) {
                maxCount = diemRoi[i];
                maxDiem = i;
            }
        }

        // Phân tích điểm rơi trong 10 phiên gần nhất
        const diemRoiGan = {};
        const last10 = this.data.slice(-10);
        last10.forEach(d => {
            diemRoiGan[d.total] = (diemRoiGan[d.total] || 0) + 1;
        });

        let maxGanCount = 0;
        let maxGanDiem = 3;
        for (let i = 3; i <= 18; i++) {
            if (diemRoiGan[i] > maxGanCount) {
                maxGanCount = diemRoiGan[i];
                maxGanDiem = i;
            }
        }

        // Dự đoán điểm rơi tiếp theo
        let duDoanDiem = null;
        if (maxGanCount >= 2) {
            duDoanDiem = maxGanDiem;
        } else {
            duDoanDiem = maxDiem;
        }

        // Phân tích xu hướng điểm
        const xuHuongDiem = [];
        for (let i = 1; i < size; i++) {
            xuHuongDiem.push(this.data[i].total - this.data[i-1].total);
        }
        const trungBinhXuHuong = xuHuongDiem.reduce((s, c) => s + c, 0) / xuHuongDiem.length;

        return {
            diemRoi: diemRoi,
            diemRoiGan: diemRoiGan,
            diemXuatHienNhieuNhat: maxDiem,
            diemGanXuatHienNhieuNhat: maxGanDiem,
            duDoanDiem: duDoanDiem,
            trungBinhXuHuong: trungBinhXuHuong,
            xuHuongDiem: xuHuongDiem
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 8: PHÂN TÍCH CHUẨN CỐT LÕI
// ============================================================================
class PhanTichChuan {
    constructor(data) {
        this.data = data;
    }

    phanTich() {
        const size = this.data.length;
        if (size < 30) return {};

        // Phân tích chuẩn cốt lõi
        const tongDiem = this.data.map(d => d.total);
        const trungBinh = tongDiem.reduce((s, c) => s + c, 0) / size;
        const phuongSai = tongDiem.reduce((s, c) => s + Math.pow(c - trungBinh, 2), 0) / size;
        const doLechChuan = Math.sqrt(phuongSai);

        // Phân tích phân phối
        const phanPhoi = {};
        for (let i = 3; i <= 18; i++) {
            phanPhoi[i] = 0;
        }
        this.data.forEach(d => {
            phanPhoi[d.total] = (phanPhoi[d.total] || 0) + 1;
        });

        // Tìm ngưỡng
        let nguongCao = 0;
        let nguongThap = 0;
        for (let i = 3; i <= 18; i++) {
            if (phanPhoi[i] > 0) {
                if (nguongThap === 0) nguongThap = i;
                nguongCao = i;
            }
        }

        // Phân tích chu kỳ
        const chuKy = [];
        for (let i = 1; i < size; i++) {
            if (this.data[i].side !== this.data[i-1].side) {
                chuKy.push(i);
            }
        }

        const chuKyTrungBinh = chuKy.length > 0 ? 
            chuKy.reduce((s, c, idx) => {
                if (idx === 0) return s;
                return s + (c - chuKy[idx-1]);
            }, 0) / (chuKy.length - 1) : 0;

        // Đánh giá độ ổn định
        const doOnDinh = 1 - (doLechChuan / trungBinh);

        return {
            trungBinh: trungBinh,
            phuongSai: phuongSai,
            doLechChuan: doLechChuan,
            nguongCao: nguongCao,
            nguongThap: nguongThap,
            phanPhoi: phanPhoi,
            chuKyTrungBinh: chuKyTrungBinh,
            doOnDinh: doOnDinh,
            danhGia: doOnDinh > 0.8 ? 'ON_DINH_CAO' : (doOnDinh > 0.6 ? 'ON_DINH_TRUNG_BINH' : 'ON_DINH_THAP')
        };
    }
}

// ============================================================================
// THUẬT TOÁN CON 9: PHÂN TÍCH ALL CẦU
// ============================================================================
class PhanTichAllCau {
    constructor(data) {
        this.data = data;
        this.allCau = [];
    }

    phanTich() {
        const size = this.data.length;
        if (size < 30) return {};

        // Phân tích tất cả các loại cầu
        const cauDon = [];
        const cauDanXen = [];
        const cauPhoiHop = [];
        const cauDacBiet = [];

        for (let i = 0; i < size - 2; i++) {
            const a = this.data[i].side;
            const b = this.data[i+1].side;
            const c = this.data[i+2].side;

            // Cầu đơn (cùng loại)
            if (a === b && b === c) {
                cauDon.push({ viTri: i, loai: a, doDai: 3 });
            }

            // Cầu đan xen
            if (a !== b && b !== c && a !== c) {
                cauDanXen.push({ viTri: i, loai: 'DAN_XEN' });
            }

            // Cầu đặc biệt (bão)
            if (this.data[i].isTriple && this.data[i+1].isTriple && this.data[i+2].isTriple) {
                cauDacBiet.push({ viTri: i, loai: 'BAO' });
            }
        }

        // Phân tích cầu dài
        let cauDaiNhat = [];
        let cauHienTai = [];
        for (let i = 0; i < size; i++) {
            if (i === 0) {
                cauHienTai.push(this.data[i].side);
            } else {
                if (this.data[i].side === this.data[i-1].side) {
                    cauHienTai.push(this.data[i].side);
                } else {
                    if (cauHienTai.length > cauDaiNhat.length) {
                        cauDaiNhat = [...cauHienTai];
                    }
                    cauHienTai = [this.data[i].side];
                }
            }
        }
        if (cauHienTai.length > cauDaiNhat.length) {
            cauDaiNhat = [...cauHienTai];
        }

        // Thống kê cầu
        const thongKeCau = {
            cauDon: cauDon,
            cauDanXen: cauDanXen,
            cauPhoiHop: cauPhoiHop,
            cauDacBiet: cauDacBiet,
            cauDaiNhat: cauDaiNhat,
            doDaiCauDaiNhat: cauDaiNhat.length,
            loaiCauDaiNhat: cauDaiNhat[0] || 'KHONG_XAC_DINH'
        };

        this.allCau = thongKeCau;
        return thongKeCau;
    }
}

// ============================================================================
// THUẬT TOÁN CON 10: PHÂN TÍCH DỮ LIỆU BỊ THIẾU
// ============================================================================
class PhanTichDuLieuThieu {
    constructor(data) {
        this.data = data;
    }

    phanTich() {
        const size = this.data.length;
        if (size < 10) return {};

        // Kiểm tra dữ liệu bị thiếu
        let duLieuThieu = [];
        let khoangTrong = [];
        let phienBiThieu = [];

        // Kiểm tra phiên bị thiếu
        for (let i = 1; i < size; i++) {
            const khoangCach = this.data[i].id - this.data[i-1].id;
            if (khoangCach > 1) {
                for (let j = 1; j < khoangCach; j++) {
                    phienBiThieu.push(this.data[i-1].id + j);
                }
                khoangTrong.push({
                    tu: this.data[i-1].id,
                    den: this.data[i].id,
                    soLuong: khoangCach - 1
                });
            }
        }

        // Đánh giá chất lượng dữ liệu
        const tyLeThieu = phienBiThieu.length / (size + phienBiThieu.length);
        const chatLuong = 1 - tyLeThieu;

        // Dự đoán dữ liệu bị thiếu
        let duDoanDuLieuThieu = [];
        if (khoangTrong.length > 0) {
            // Sử dụng nội suy tuyến tính
            khoangTrong.forEach(khoang => {
                const truoc = this.data.find(d => d.id === khoang.tu);
                const sau = this.data.find(d => d.id === khoang.den);
                if (truoc && sau) {
                    const step = (sau.total - truoc.total) / (khoang.soLuong + 1);
                    for (let i = 1; i <= khoang.soLuong; i++) {
                        duDoanDuLieuThieu.push({
                            phien: truoc.id + i,
                            tongDuDoan: truoc.total + step * i,
                            sideDuDoan: (truoc.total + step * i) >= 11 ? 'TAI' : 'XIU'
                        });
                    }
                }
            });
        }

        return {
            soPhienBiThieu: phienBiThieu.length,
            phienBiThieu: phienBiThieu,
            khoangTrong: khoangTrong,
            tyLeThieu: tyLeThieu,
            chatLuongDuLieu: chatLuong,
            duDoanDuLieuThieu: duDoanDuLieuThieu,
            danhGia: chatLuong > 0.9 ? 'CHAT_LUONG_CAO' : (chatLuong > 0.7 ? 'CHAT_LUONG_TRUNG_BINH' : 'CHAT_LUONG_THAP')
        };
    }
}

// ============================================================================
// THUẬT TOÁN CHÍNH: TỔNG HỢP 10 THUẬT TOÁN CON
// ============================================================================
class ThuatToanChinh {
    constructor(historyData) {
        this.rawData = historyData;
        this.processedData = [];
        this.ketQuaTongHop = {};
        this.initialize();
    }

    initialize() {
        this.processData();
        this.thucHien10ThuatToanCon();
        this.tongHopKetQua();
    }

    processData() {
        const cleanData = this.rawData.filter(item => {
            const d1 = parseInt(item.Xuc_cac_1 || item.Xuc_xac_1 || 0);
            const d2 = parseInt(item.Xuc_cac_2 || item.Xuc_xac_2 || 0);
            const d3 = parseInt(item.Xuc_cac_3 || item.Xuc_xac_3 || 0);
            return (d1 + d2 + d3) > 0;
        });

        this.processedData = cleanData.slice(-200).reverse().map(item => {
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

    thucHien10ThuatToanCon() {
        const data = this.processedData;
        const size = data.length;

        if (size < 10) {
            this.ketQuaTongHop = {
                prediction: 'XIU',
                rate: 50,
                cau: 'CHUA_DU_DU_LIEU',
                chiTiet: {}
            };
            return;
        }

        // === THUẬT TOÁN CON 1: NHẬN DIỆN CẦU ===
        const nhanDien = new CauNhanDien(data);
        const ketQuaNhanDien = nhanDien.nhanDien();

        // === THUẬT TOÁN CON 2: PHÂN TÍCH CẦU ===
        const phanTichCau = new CauPhanTich(data, ketQuaNhanDien);
        const ketQuaPhanTichCau = phanTichCau.phanTich();

        // === THUẬT TOÁN CON 3: ĐỐI CHIẾU CẦU ===
        const doiChieu = new CauDoiChieu(data, ketQuaNhanDien, ketQuaPhanTichCau);
        const ketQuaDoiChieu = doiChieu.doiChieu();

        // === THUẬT TOÁN CON 4: KIỂM TRA CẦU ===
        const kiemTra = new CauKiemTra(data, ketQuaNhanDien);
        const ketQuaKiemTra = kiemTra.kiemTra();

        // === THUẬT TOÁN CON 5: HỌC CẦU ===
        const hocCau = new CauHoc(data);
        const ketQuaHoc = hocCau.hoc();

        // === THUẬT TOÁN CON 6: PHÂN TÍCH CÁC XUẤT ===
        const phanTichXuat = new PhanTichXuat(data);
        const ketQuaPhanTichXuat = phanTichXuat.phanTich();

        // === THUẬT TOÁN CON 7: PHÂN TÍCH ĐIỂM RƠI ===
        const phanTichDiemRoi = new PhanTichDiemRoi(data);
        const ketQuaDiemRoi = phanTichDiemRoi.phanTich();

        // === THUẬT TOÁN CON 8: PHÂN TÍCH CHUẨN CỐT LÕI ===
        const phanTichChuan = new PhanTichChuan(data);
        const ketQuaChuan = phanTichChuan.phanTich();

        // === THUẬT TOÁN CON 9: PHÂN TÍCH ALL CẦU ===
        const phanTichAllCau = new PhanTichAllCau(data);
        const ketQuaAllCau = phanTichAllCau.phanTich();

        // === THUẬT TOÁN CON 10: PHÂN TÍCH DỮ LIỆU THIẾU ===
        const phanTichThieu = new PhanTichDuLieuThieu(data);
        const ketQuaThieu = phanTichThieu.phanTich();

        // Lưu kết quả
        this.ketQuaTongHop = {
            thuatToan1_NhanDienCau: ketQuaNhanDien,
            thuatToan2_PhanTichCau: ketQuaPhanTichCau,
            thuatToan3_DoiChieuCau: ketQuaDoiChieu,
            thuatToan4_KiemTraCau: ketQuaKiemTra,
            thuatToan5_HocCau: ketQuaHoc,
            thuatToan6_PhanTichXuat: ketQuaPhanTichXuat,
            thuatToan7_PhanTichDiemRoi: ketQuaDiemRoi,
            thuatToan8_PhanTichChuan: ketQuaChuan,
            thuatToan9_PhanTichAllCau: ketQuaAllCau,
            thuatToan10_PhanTichThieu: ketQuaThieu
        };
    }

    tongHopKetQua() {
        const data = this.ketQuaTongHop;
        const size = this.processedData.length;

        if (size < 10) {
            this.ketQuaCuoiCung = {
                prediction: 'XIU',
                rate: 50,
                cau: 'CHUA_DU_DU_LIEU'
            };
            return;
        }

        // === TỔNG HỢP ĐIỂM TỪ 10 THUẬT TOÁN CON ===
        let diemTai = 0;
        let diemXiu = 0;
        let cacYeuTo = [];
        let trongSo = 0;

        // 1. Từ thuật toán 1: Nhận diện cầu
        if (data.thuatToan1_NhanDienCau) {
            const cau = data.thuatToan1_NhanDienCau;
            if (cau.cauCuoiCung === 'TAI') {
                diemTai += cau.doDaiCauHienTai * 1.5;
                cacYeuTo.push(`Cầu Tài dài ${cau.doDaiCauHienTai} phiên`);
            } else if (cau.cauCuoiCung === 'XIU') {
                diemXiu += cau.doDaiCauHienTai * 1.5;
                cacYeuTo.push(`Cầu Xỉu dài ${cau.doDaiCauHienTai} phiên`);
            }
        }

        // 2. Từ thuật toán 2: Phân tích cầu
        if (data.thuatToan2_PhanTichCau) {
            const phanTich = data.thuatToan2_PhanTichCau;
            if (phanTich.duDoanCauTiep === 'TAI') {
                diemTai += phanTich.doTinCayCau * 20;
                cacYeuTo.push(`Phân tích cầu: Tài ${Math.round(phanTich.doTinCayCau * 100)}%`);
            } else if (phanTich.duDoanCauTiep === 'XIU') {
                diemXiu += phanTich.doTinCayCau * 20;
                cacYeuTo.push(`Phân tích cầu: Xỉu ${Math.round(phanTich.doTinCayCau * 100)}%`);
            }
        }

        // 3. Từ thuật toán 3: Đối chiếu cầu
        if (data.thuatToan3_DoiChieuCau) {
            const doiChieu = data.thuatToan3_DoiChieuCau;
            if (doiChieu.duDoan === 'TAI') {
                diemTai += doiChieu.tyLeTaiSauCau * 25;
                cacYeuTo.push(`Đối chiếu: Tài ${Math.round(doiChieu.tyLeTaiSauCau * 100)}%`);
            } else if (doiChieu.duDoan === 'XIU') {
                diemXiu += doiChieu.tyLeXiuSauCau * 25;
                cacYeuTo.push(`Đối chiếu: Xỉu ${Math.round(doiChieu.tyLeXiuSauCau * 100)}%`);
            }
        }

        // 4. Từ thuật toán 4: Kiểm tra cầu
        if (data.thuatToan4_KiemTraCau) {
            const kiemTra = data.thuatToan4_KiemTraCau;
            if (kiemTra.danhGia === 'CAU_MANH') {
                const lastItem = this.processedData[this.processedData.length - 1];
                if (lastItem.side === 'TAI') {
                    diemTai += kiemTra.doTinCay * 15;
                    cacYeuTo.push(`Cầu mạnh Tài ${Math.round(kiemTra.doTinCay * 100)}%`);
                } else {
                    diemXiu += kiemTra.doTinCay * 15;
                    cacYeuTo.push(`Cầu mạnh Xỉu ${Math.round(kiemTra.doTinCay * 100)}%`);
                }
            }
        }

        // 5. Từ thuật toán 5: Học cầu
        if (data.thuatToan5_HocCau) {
            const hoc = data.thuatToan5_HocCau;
            if (hoc.duDoan === 'TAI') {
                diemTai += hoc.doTinCay * 18;
                cacYeuTo.push(`Học cầu: Tài ${Math.round(hoc.doTinCay * 100)}%`);
            } else if (hoc.duDoan === 'XIU') {
                diemXiu += hoc.doTinCay * 18;
                cacYeuTo.push(`Học cầu: Xỉu ${Math.round(hoc.doTinCay * 100)}%`);
            }
        }

        // 6. Từ thuật toán 6: Phân tích xuất
        if (data.thuatToan6_PhanTichXuat) {
            const xuat = data.thuatToan6_PhanTichXuat;
            if (xuat.duDoanXuatTiep === 'TAI') {
                diemTai += 15;
                cacYeuTo.push(`Phân tích xuất: Tài sắp về`);
            } else if (xuat.duDoanXuatTiep === 'XIU') {
                diemXiu += 15;
                cacYeuTo.push(`Phân tích xuất: Xỉu sắp về`);
            }
        }

        // 7. Từ thuật toán 7: Phân tích điểm rơi
        if (data.thuatToan7_PhanTichDiemRoi) {
            const diemRoi = data.thuatToan7_PhanTichDiemRoi;
            const lastItem = this.processedData[this.processedData.length - 1];
            const duDoanDiem = diemRoi.duDoanDiem;
            
            if (duDoanDiem >= 11 && lastItem.side === 'TAI') {
                diemTai += 12;
                cacYeuTo.push(`Điểm rơi ${duDoanDiem} - Tài`);
            } else if (duDoanDiem < 11 && lastItem.side === 'XIU') {
                diemXiu += 12;
                cacYeuTo.push(`Điểm rơi ${duDoanDiem} - Xỉu`);
            }
        }

        // 8. Từ thuật toán 8: Phân tích chuẩn
        if (data.thuatToan8_PhanTichChuan) {
            const chuan = data.thuatToan8_PhanTichChuan;
            const lastItem = this.processedData[this.processedData.length - 1];
            
            if (lastItem.total > chuan.nguongCao - 1) {
                diemXiu += 10;
                cacYeuTo.push(`Chuẩn: Tổng cao -> Xỉu`);
            } else if (lastItem.total < chuan.nguongThap + 1) {
                diemTai += 10;
                cacYeuTo.push(`Chuẩn: Tổng thấp -> Tài`);
            }
        }

        // 9. Từ thuật toán 9: Phân tích all cầu
        if (data.thuatToan9_PhanTichAllCau) {
            const allCau = data.thuatToan9_PhanTichAllCau;
            if (allCau.loaiCauDaiNhat === 'TAI' || allCau.loaiCauDaiNhat === 'XIU') {
                if (allCau.loaiCauDaiNhat === 'TAI') {
                    diemTai += 8;
                    cacYeuTo.push(`All cầu: Tài chiếm ưu thế`);
                } else {
                    diemXiu += 8;
                    cacYeuTo.push(`All cầu: Xỉu chiếm ưu thế`);
                }
            }
        }

        // 10. Từ thuật toán 10: Phân tích dữ liệu thiếu
        if (data.thuatToan10_PhanTichThieu) {
            const thieu = data.thuatToan10_PhanTichThieu;
            if (thieu.chatLuongDuLieu > 0.8) {
                // Dữ liệu tốt, tăng độ tin cậy
                cacYeuTo.push(`Dữ liệu chất lượng ${Math.round(thieu.chatLuongDuLieu * 100)}%`);
            } else {
                // Dữ liệu kém, giảm độ tin cậy
                cacYeuTo.push(`Dữ liệu ${Math.round(thieu.tyLeThieu * 100)}% thiếu`);
            }
        }

        // === QUYẾT ĐỊNH CUỐI CÙNG ===
        let prediction = 'XIU';
        let rate = 50;
        let cau = '';

        // Tính tổng điểm
        const tongDiem = diemTai + diemXiu;
        
        if (tongDiem > 0) {
            const tyLeTai = diemTai / tongDiem;
            const tyLeXiu = diemXiu / tongDiem;
            
            if (tyLeTai > tyLeXiu) {
                prediction = 'TAI';
                rate = Math.min(50 + Math.round(tyLeTai * 35), 85);
                rate = Math.max(rate, 53);
            } else if (tyLeXiu > tyLeTai) {
                prediction = 'XIU';
                rate = Math.min(50 + Math.round(tyLeXiu * 35), 85);
                rate = Math.max(rate, 53);
            } else {
                // Hòa, dùng dữ liệu gần nhất
                const lastItem = this.processedData[this.processedData.length - 1];
                prediction = lastItem.side;
                rate = 55;
                cacYeuTo.push('Hòa điểm -> theo phiên cuối');
            }
        } else {
            // Không có dữ liệu, dùng thống kê đơn giản
            const taiCount = this.processedData.filter(d => d.side === 'TAI').length;
            const xiuCount = this.processedData.filter(d => d.side === 'XIU').length;
            prediction = taiCount > xiuCount ? 'TAI' : 'XIU';
            rate = 53;
            cacYeuTo.push('Dùng thống kê cơ bản');
        }

        // Tạo cầu
        cau = cacYeuTo.length > 0 ? cacYeuTo.slice(0, 5).join(' | ') : 'KHONG_CO_CAU';

        // Log chi tiết
        console.log(`[THUẬT TOÁN CHÍNH] Tai: ${diemTai.toFixed(1)}, Xiu: ${diemXiu.toFixed(1)}, Pred: ${prediction}, Rate: ${rate}%`);

        this.ketQuaCuoiCung = {
            prediction: prediction,
            rate: rate,
            cau: cau,
            chiTiet: {
                diemTai: diemTai,
                diemXiu: diemXiu,
                soYeuTo: cacYeuTo.length,
                allYeuTo: cacYeuTo
            }
        };
    }

    getResults() {
        return this.ketQuaCuoiCung || {
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
    res.send("HỆ THỐNG 10 THUẬT TOÁN CON + 1 THUẬT TOÁN CHÍNH - PHÂN TÍCH SIÊU CẤP VIP PRO");
});

app.listen(PORT, () => {
    console.log(`[ONLINE] Hệ thống 10 thuật toán con + 1 thuật toán chính đã sẵn sàng trên cổng: ${PORT}`);
});
