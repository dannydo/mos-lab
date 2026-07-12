'use client';

import '../../suppress-warnings';
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api';
import {
  Typography,
  Card,
  theme,
  DatePicker,
  Radio,
  Space,
  Row,
  Col,
  Table,
  Badge,
  Spin,
  message,
  Divider,
  Button,
  Tag,
  Tabs,
  Avatar,
  Drawer,
  Rate,
  Tooltip
} from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  SyncOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  RightOutlined,
  GiftOutlined,
  InboxOutlined,
  SmileOutlined,
  EyeOutlined,
  CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../context/ThemeContext';

const { Title, Text } = Typography;

// --- Interfaces for Data ---

interface BookingData {
  key: string;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
  createdTime: string;
  avatarColor?: string;
  code?: string;
  email?: string;
  ltv?: string;
  bookingsCount?: number;
  diamonds?: number;
  frequency?: string;
  gender?: string;
  dob?: string;
  daysAway?: string;
  favoriteDay?: string;
  oc?: string;
  historyService?: string;
  historyBranch?: string;
  historyCv?: string;
  historyCcIn?: string;
  historyCcOut?: string;
  historyBooker?: string;
  historyDate?: string;
  historyStatus?: string;
  historyNote?: string;
}

interface ComingClientData {
  key: string;
  time: string;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
  cc: string;
  cv: string;
  service: string;
  status: 'arrived' | 'confirmed' | 'pending' | 'late';
  avatarColor?: string;
  code?: string;
  email?: string;
  ltv?: string;
  bookingsCount?: number;
  diamonds?: number;
  frequency?: string;
  gender?: string;
  dob?: string;
  daysAway?: string;
  favoriteDay?: string;
  oc?: string;
  historyService?: string;
  historyBranch?: string;
  historyCv?: string;
  historyCcIn?: string;
  historyCcOut?: string;
  historyBooker?: string;
  historyDate?: string;
  historyStatus?: string;
  historyNote?: string;
}

interface ShopCCData {
  name: string;
  doing: string;
  clients: number;
  combos: number;
  revenue: number;
  shift: 'sáng' | 'chiều' | 'full' | 'off';
  attendance: 'none' | 'checked_in' | 'checked_out' | 'late';
}

interface ShopCVData {
  name: string;
  doing: string;
  clients: number;
  shift: 'sáng' | 'chiều' | 'full' | 'off';
  attendance: 'none' | 'checked_in' | 'checked_out' | 'late';
  status: 'busy' | 'available';
}

interface BranchDetail {
  revLe: number;
  revCombo: number;
  revProduct: number;
  cc: ShopCCData[];
  cv: ShopCVData[];
  coming: ComingClientData[];
}

export default function TodayDashboard() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [liveClock, setLiveClock] = useState('');
  
  // Tabs states
  const [bookingTab, setBookingTab] = useState<'combo' | 'other'>('combo');
  const [comingBranch, setComingBranch] = useState<'detham' | 'pxl' | 'estella' | 'all'>('detham');
  const [shopBranch, setShopBranch] = useState<'detham' | 'pxl' | 'estella' | 'all'>('detham');

  // Drawer states
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<BookingData | null>(null);

  const openCustomerDrawer = (record: BookingData) => {
    setSelectedCustomer(record);
    setDrawerVisible(true);
  };

  // Realtime simulated data
  const [branchesData, setBranchesData] = useState<Record<string, BranchDetail>>({
    detham: {
      revLe: 12500000,
      revCombo: 18000000,
      revProduct: 2000000,
      cc: [
        { name: "Nguyễn Minh Thuỷ", doing: "Đang tư vấn KH mới (Trần Thị Mai)", clients: 12, combos: 3, revenue: 18000000, shift: 'sáng', attendance: 'checked_in' },
        { name: "Phạm Khánh Ly", doing: "Đang gọi điện CSKH cũ", clients: 10, combos: 1, revenue: 9500000, shift: 'chiều', attendance: 'late' },
        { name: "Trần Bảo Ngọc", doing: "Trống (Đang hỗ trợ thu ngân)", clients: 6, combos: 1, revenue: 5000000, shift: 'full', attendance: 'checked_out' },
        { name: "Lê Thu Trang", doing: "Nghỉ phép tuần", clients: 0, combos: 0, revenue: 0, shift: 'off', attendance: 'none' }
      ],
      cv: [
        { name: "Lý Mỹ Linh", doing: "Đang nối mi Volume (Khách Nguyễn Thị Đào)", clients: 5, shift: 'sáng', attendance: 'checked_in', status: 'busy' },
        { name: "Trần Hoàng Anh", doing: "Trống (Chờ khách 16:00)", clients: 4, shift: 'sáng', attendance: 'checked_in', status: 'available' },
        { name: "Vũ Phương Thanh", doing: "Đang uốn mi Collagen", clients: 2, shift: 'chiều', attendance: 'late', status: 'busy' },
        { name: "Đỗ Thuỳ Dung", doing: "Trống (Chờ nhận ca tiếp theo)", clients: 1, shift: 'chiều', attendance: 'checked_in', status: 'available' },
        { name: "Phạm Thị Hoa", doing: "Nghỉ phép tuần", clients: 0, shift: 'off', attendance: 'none', status: 'available' }
      ],
      coming: [
        { 
          key: '1', 
          time: "15:30", 
          customer: "Trần Thị Mai", 
          phone: "0901234567", 
          group: 'combo_live', 
          promo: "PROMO20", 
          booker: "App Online", 
          cc: "Nguyễn Minh Thuỷ", 
          cv: "Lý Mỹ Linh", 
          service: "Dặm mi Volume (Combo)", 
          status: 'pending',
          avatarColor: '#1890ff',
          code: "52001",
          email: "mai.tran@gmail.com",
          ltv: "4.800.000 đ",
          bookingsCount: 8,
          diamonds: 48,
          frequency: "1.2 tuần/lần",
          gender: "Nữ",
          dob: "1994-08-15",
          daysAway: "3 ngày trước",
          favoriteDay: "Thứ Bảy",
          oc: "Nguyễn Minh Thuỷ",
          historyService: "Dặm mi Volume",
          historyBranch: "Đề Thám",
          historyCv: "Lý Mỹ Linh",
          historyCcIn: "Nguyễn Minh Thuỷ",
          historyCcOut: "Nguyễn Minh Thuỷ",
          historyBooker: "App Online",
          historyDate: "12/07/2026",
          historyStatus: "Hoàn thành",
          historyNote: "Khách VIP, thích mi dầy."
        },
        { 
          key: '2', 
          time: "16:00", 
          customer: "Ngô Mỹ Dung", 
          phone: "0934567890", 
          group: 'single', 
          promo: null, 
          booker: "Zalo Chatbot", 
          cc: "Phạm Khánh Ly", 
          cv: "Trần Hoàng Anh", 
          service: "Nối mi Classic mới (Lẻ)", 
          status: 'confirmed',
          avatarColor: '#52c41a',
          code: "52002",
          email: "dung.ngo@gmail.com",
          ltv: "800.000 đ",
          bookingsCount: 2,
          diamonds: 8,
          frequency: "4 tuần/lần",
          gender: "Nữ",
          dob: "1997-12-05",
          daysAway: "15 ngày trước",
          favoriteDay: "Chủ Nhật",
          oc: "Phạm Khánh Ly",
          historyService: "Nối mi Classic mới",
          historyBranch: "Đề Thám",
          historyCv: "Trần Hoàng Anh",
          historyCcIn: "Phạm Khánh Ly",
          historyCcOut: "Phạm Khánh Ly",
          historyBooker: "Zalo Chatbot",
          historyDate: "12/07/2026",
          historyStatus: "Hoàn thành",
          historyNote: "Thích kiểu nhẹ nhàng tự nhiên."
        },
        { 
          key: '3', 
          time: "16:30", 
          customer: "Phạm Hà Giang", 
          phone: "0987654321", 
          group: 'single', 
          promo: "COMBO50", 
          booker: "Facebook Page", 
          cc: "Trần Bảo Ngọc", 
          cv: "Nghỉ phép", 
          service: "Uốn mi Collagen (Lẻ)", 
          status: 'late',
          avatarColor: '#fa8c16',
          code: "52003",
          email: "giang.pham@gmail.com",
          ltv: "1.200.000 đ",
          bookingsCount: 3,
          diamonds: 12,
          frequency: "3 tuần/lần",
          gender: "Nữ",
          dob: "1995-03-22",
          daysAway: "7 ngày trước",
          favoriteDay: "Thứ Tư",
          oc: "Trần Bảo Ngọc",
          historyService: "Uốn mi Collagen",
          historyBranch: "Đề Thám",
          historyCv: "Vũ Phương Thanh",
          historyCcIn: "Trần Bảo Ngọc",
          historyCcOut: "Trần Bảo Ngọc",
          historyBooker: "Facebook Page",
          historyDate: "12/07/2026",
          historyStatus: "Hoàn thành",
          historyNote: "Từng bị dị ứng keo nối."
        },
        { 
          key: '4', 
          time: "15:00", 
          customer: "Nguyễn Thị Đào", 
          phone: "0911223344", 
          group: 'combo_dead', 
          promo: null, 
          booker: "Call Center", 
          cc: "Nguyễn Minh Thuỷ", 
          cv: "Lý Mỹ Linh", 
          service: "Nối mi thiết kế (Lẻ)", 
          status: 'arrived',
          avatarColor: '#eb2f96',
          code: "52004",
          email: "dao.nguyen@gmail.com",
          ltv: "2.500.000 đ",
          bookingsCount: 5,
          diamonds: 25,
          frequency: "2.5 tuần/lần",
          gender: "Nữ",
          dob: "1991-11-30",
          daysAway: "10 ngày trước",
          favoriteDay: "Thứ Sáu",
          oc: "Nguyễn Minh Thuỷ",
          historyService: "Nối mi thiết kế",
          historyBranch: "Đề Thám",
          historyCv: "Lý Mỹ Linh",
          historyCcIn: "Nguyễn Minh Thuỷ",
          historyCcOut: "Nguyễn Minh Thuỷ",
          historyBooker: "Call Center",
          historyDate: "12/07/2026",
          historyStatus: "Hoàn thành",
          historyNote: "Khách quen từ năm 2024."
        }
      ]
    },
    pxl: {
      revLe: 9800000,
      revCombo: 12000000,
      revProduct: 3000000,
      cc: [
        { name: "Lê Cẩm Tú", doing: "Đang chốt sale combo mới", clients: 9, combos: 2, revenue: 12000000, shift: 'sáng', attendance: 'checked_in' },
        { name: "Nguyễn Quỳnh Chi", doing: "Đang tư vấn KH lẻ nâng cấp combo", clients: 8, combos: 1, revenue: 7800000, shift: 'chiều', attendance: 'checked_in' },
        { name: "Hoàng Thanh Hà", doing: "Trống ca", clients: 4, combos: 0, revenue: 5000000, shift: 'full', attendance: 'checked_out' },
        { name: "Đặng Mỹ Linh", doing: "Nghỉ phép tuần", clients: 0, combos: 0, revenue: 0, shift: 'off', attendance: 'none' }
      ],
      cv: [
        { name: "Đặng Hồng Nhung", doing: "Trống (Đang ăn nhẹ ca lỡ)", clients: 3, shift: 'sáng', attendance: 'checked_in', status: 'available' },
        { name: "Phùng Mỹ Tâm", doing: "Đang dặm mi Classic (Khách Lê Thu Giang)", clients: 4, shift: 'sáng', attendance: 'checked_in', status: 'busy' },
        { name: "Trịnh Gia Linh", doing: "Trống (Chờ khách 16:15)", clients: 2, shift: 'chiều', attendance: 'checked_in', status: 'available' },
        { name: "Nguyễn Bích Ngọc", doing: "Nghỉ phép tuần", clients: 0, shift: 'off', attendance: 'none', status: 'available' }
      ],
      coming: [
        { 
          key: '1', 
          time: "15:45", 
          customer: "Hoàng Kim Chi", 
          phone: "0944556677", 
          group: 'combo_live', 
          promo: "PROMO20", 
          booker: "App Online", 
          cc: "Lê Cẩm Tú", 
          cv: "Phùng Mỹ Tâm", 
          service: "Nối mi Volume mới (Combo)", 
          status: 'pending',
          avatarColor: '#2f54eb',
          code: "53001",
          email: "chi.hoang@gmail.com",
          ltv: "3.200.000 đ",
          bookingsCount: 6,
          diamonds: 32,
          frequency: "2 tuần/lần",
          gender: "Nữ",
          dob: "1996-05-18",
          daysAway: "5 ngày trước",
          oc: "Lê Cẩm Tú"
        },
        { 
          key: '2', 
          time: "16:15", 
          customer: "Trần Bảo Thy", 
          phone: "0907788990", 
          group: 'single', 
          promo: null, 
          booker: "Instagram Page", 
          cc: "Nguyễn Quỳnh Chi", 
          cv: "Trịnh Gia Linh", 
          service: "Uốn mi Collagen (Lẻ)", 
          status: 'confirmed',
          avatarColor: '#722ed1',
          code: "53002",
          email: "thy.tran@gmail.com",
          ltv: "600.000 đ",
          bookingsCount: 1,
          diamonds: 6,
          frequency: "N/A",
          gender: "Nữ",
          dob: "2000-09-12",
          daysAway: "N/A",
          oc: "Nguyễn Quỳnh Chi"
        },
        { 
          key: '3', 
          time: "15:10", 
          customer: "Lê Thu Giang", 
          phone: "0918899001", 
          group: 'combo_live', 
          promo: null, 
          booker: "Zalo Chatbot", 
          cc: "Lê Cẩm Tú", 
          cv: "Phùng Mỹ Tâm", 
          service: "Dặm mi Classic", 
          status: 'arrived',
          avatarColor: '#13c2c2',
          code: "53003",
          email: "giang.le@gmail.com",
          ltv: "2.100.000 đ",
          bookingsCount: 4,
          diamonds: 21,
          frequency: "3 tuần/lần",
          gender: "Nữ",
          dob: "1993-01-25",
          daysAway: "8 ngày trước",
          oc: "Lê Cẩm Tú"
        }
      ]
    },
    estella: {
      revLe: 15200000,
      revCombo: 24000000,
      revProduct: 6000000,
      cc: [
        { name: "Lâm Nhã Phương", doing: "Đang hỗ trợ khách ký hợp đồng combo", clients: 15, combos: 4, revenue: 22500000, shift: 'sáng', attendance: 'checked_in' },
        { name: "Đinh Hoài An", doing: "Đang kiểm tra hồ sơ khách hàng ngày", clients: 12, combos: 3, revenue: 16200000, shift: 'chiều', attendance: 'checked_in' },
        { name: "Tống Khánh Vân", doing: "Đang tư vấn chăm sóc sau nối mi", clients: 9, combos: 1, revenue: 6500000, shift: 'full', attendance: 'checked_out' },
        { name: "Bùi Ngọc Ánh", doing: "Nghỉ phép tuần", clients: 0, combos: 0, revenue: 0, shift: 'off', attendance: 'none' }
      ],
      cv: [
        { name: "Nguyễn Thuỳ Lâm", doing: "Đang nối mi Volume (Khách P. Phương Thảo)", clients: 6, shift: 'sáng', attendance: 'checked_in', status: 'busy' },
        { name: "Cao Thanh Hằng", doing: "Đang uốn mi Collagen nâng tông", clients: 4, shift: 'sáng', attendance: 'checked_in', status: 'busy' },
        { name: "Mai Hồng Ngọc", doing: "Trống (Chờ khách 17:00)", clients: 3, shift: 'chiều', attendance: 'checked_in', status: 'available' },
        { name: "Bùi Kiều Vy", doing: "Đang kiểm tra dụng cụ mi", clients: 2, shift: 'chiều', attendance: 'checked_in', status: 'busy' },
        { name: "Trần Diệu Linh", doing: "Nghỉ phép tuần", clients: 0, shift: 'off', attendance: 'none', status: 'available' }
      ],
      coming: [
        { 
          key: '1', 
          time: "15:30", 
          customer: "Phạm Phương Thảo", 
          phone: "0977889900", 
          group: 'combo_live', 
          promo: "COMBO15", 
          booker: "App Online", 
          cc: "Lâm Nhã Phương", 
          cv: "Nguyễn Thuỳ Lâm", 
          service: "Nối mi Volume mới (Combo)", 
          status: 'arrived',
          avatarColor: '#fadb14',
          code: "54001",
          email: "thao.pham@gmail.com",
          ltv: "5.500.000 đ",
          bookingsCount: 10,
          diamonds: 55,
          frequency: "1.5 tuần/lần",
          gender: "Nữ",
          dob: "1992-07-08",
          daysAway: "2 ngày trước",
          oc: "Lâm Nhã Phương"
        },
        { 
          key: '2', 
          time: "16:00", 
          customer: "Tô Minh Thư", 
          phone: "0933221100", 
          group: 'single', 
          promo: null, 
          booker: "Call Center", 
          cc: "Đinh Hoài An", 
          cv: "Bùi Kiều Vy", 
          service: "Dặm mi thiết kế", 
          status: 'confirmed',
          avatarColor: '#fa541c',
          code: "54002",
          email: "thu.to@gmail.com",
          ltv: "1.800.000 đ",
          bookingsCount: 4,
          diamonds: 18,
          frequency: "2.5 tuần/lần",
          gender: "Nữ",
          dob: "1998-04-19",
          daysAway: "6 ngày trước",
          oc: "Đinh Hoài An"
        },
        { 
          key: '3', 
          time: "17:00", 
          customer: "Nguyễn Lan Khuê", 
          phone: "0988001122", 
          group: 'single', 
          promo: null, 
          booker: "Facebook Page", 
          cc: "Tống Khánh Vân", 
          cv: "Mai Hồng Ngọc", 
          service: "Nối mi Classic mới", 
          status: 'pending',
          avatarColor: '#eb2f96',
          code: "54003",
          email: "khue.nguyen@gmail.com",
          ltv: "900.000 đ",
          bookingsCount: 2,
          diamonds: 9,
          frequency: "4 tuần/lần",
          gender: "Nữ",
          dob: "1995-10-10",
          daysAway: "12 ngày trước",
          oc: "Tống Khánh Vân"
        },
        { 
          key: '4', 
          time: "17:30", 
          customer: "Phùng Minh Hằng", 
          phone: "0911559922", 
          group: 'single', 
          promo: "PROMO10", 
          booker: "App Online", 
          cc: "Lâm Nhã Phương", 
          cv: "Cao Thanh Hằng", 
          service: "Chăm sóc mi và uốn mi", 
          status: 'pending',
          avatarColor: '#52c41a',
          code: "54004",
          email: "hang.phung@gmail.com",
          ltv: "1.400.000 đ",
          bookingsCount: 3,
          diamonds: 14,
          frequency: "3 tuần/lần",
          gender: "Nữ",
          dob: "1999-02-28",
          daysAway: "9 ngày trước",
          oc: "Lâm Nhã Phương"
        }
      ]
    }
  });

  const [bookingsCombo, setBookingsCombo] = useState<BookingData[]>([
    {
      key: '1',
      customer: 'Trần Thị Mai',
      phone: '0901234567',
      group: 'combo_live',
      promo: null,
      booker: 'CS Mai Anh',
      createdTime: '09:45',
      avatarColor: '#1890ff',
      code: '51833',
      email: 'mai.tran@gmail.com',
      ltv: '15.000.000 đ',
      bookingsCount: 4,
      diamonds: 120,
      frequency: 'N/A',
      gender: 'N/A',
      dob: '1994-08-15',
      daysAway: '0 ngày (hôm nay)',
      favoriteDay: 'Thứ Bảy (2 lần)',
      oc: 'CS Mai Anh',
      historyService: 'Dặm mi Volume (Combo)',
      historyBranch: 'Phan Xích Long',
      historyCv: 'Mai Hồng Ngọc',
      historyCcIn: 'Quỳnh Chi',
      historyCcOut: 'Quỳnh Chi',
      historyBooker: 'CS Mai Anh',
      historyDate: 'T6, 20:30:00 10/7/2026',
      historyStatus: 'Hoàn thành',
      historyNote: 'Gia hạn thêm gói 5 buổi. Khách đi xe máy.'
    },
    {
      key: '2',
      customer: 'Hoàng Kim Chi',
      phone: '0918765432',
      group: 'combo_live',
      promo: 'WL50',
      booker: 'CS Thu Thảo',
      createdTime: '08:30',
      avatarColor: '#722ed1',
      code: '52092',
      email: 'chi.hoang@yahoo.com',
      ltv: '24.000.000 đ',
      bookingsCount: 10,
      diamonds: 250,
      frequency: 'N/A',
      gender: 'N/A',
      dob: '1990-11-20',
      daysAway: '1 ngày',
      favoriteDay: 'Thứ Tư (4 lần)',
      oc: 'CS Thu Thảo',
      historyService: 'Nối mi Volume mới (Combo)',
      historyBranch: 'Đề Thám',
      historyCv: 'Cao Thanh Hằng',
      historyCcIn: 'Linh Chi',
      historyCcOut: 'Linh Chi',
      historyBooker: 'CS Thu Thảo',
      historyDate: 'T4, 14:15:00 8/7/2026',
      historyStatus: 'Hoàn thành',
      historyNote: 'Buổi thứ 10. Tư vấn nâng cấp Combo 10 buổi mới.'
    }
  ]);

  const [bookingsOther, setBookingsOther] = useState<BookingData[]>([
    {
      key: '1',
      customer: 'Lê Thuỳ Trang',
      phone: '0933334444',
      group: 'combo_dead',
      promo: null,
      booker: 'OC Quỳnh Chi',
      createdTime: '14:20',
      avatarColor: '#f5222d',
      code: '49822',
      email: 'trangle@gmail.com',
      ltv: '5.000.000 đ',
      bookingsCount: 5,
      diamonds: 10,
      frequency: 'N/A',
      gender: 'N/A',
      dob: '1997-03-24',
      daysAway: '45 ngày',
      favoriteDay: 'Thứ Hai (2 lần)',
      oc: 'OC Quỳnh Chi',
      historyService: 'Nối mi Volume mới',
      historyBranch: 'Phan Xích Long',
      historyCv: 'Bùi Kiều Vy',
      historyCcIn: 'Yến Vy',
      historyCcOut: 'Yến Vy',
      historyBooker: 'OC Quỳnh Chi',
      historyDate: 'T2, 10:30:00 25/5/2026',
      historyStatus: 'Hoàn thành',
      historyNote: 'Combo cũ đã hết hạn. Đang tư vấn chốt combo mới.'
    },
    {
      key: '2',
      customer: 'Nguyễn Minh Anh',
      phone: '0944455566',
      group: 'combo_dead',
      promo: 'COMBONEW',
      booker: 'OC Mỹ Linh',
      createdTime: '11:15',
      avatarColor: '#fa8c16',
      code: '50119',
      email: 'minhanh@gmail.com',
      ltv: '8.000.000 đ',
      bookingsCount: 8,
      diamonds: 40,
      frequency: 'N/A',
      gender: 'N/A',
      dob: '1992-05-12',
      daysAway: '30 ngày',
      favoriteDay: 'Thứ Năm (3 lần)',
      oc: 'OC Mỹ Linh',
      historyService: 'Uốn mi Collagen',
      historyBranch: 'Estella Place',
      historyCv: 'Nguyễn Thuỳ Lâm',
      historyCcIn: 'Bích Phượng',
      historyCcOut: 'Bích Phượng',
      historyBooker: 'OC Mỹ Linh',
      historyDate: 'T5, 11:15:00 12/6/2026',
      historyStatus: 'Hoàn thành',
      historyNote: 'Nhắc khách combo cũ đã hết hạn.'
    },
    {
      key: '3',
      customer: 'Võ Mỹ Linh',
      phone: '0955566677',
      group: 'single',
      promo: null,
      booker: 'Hotline System',
      createdTime: '15:05',
      avatarColor: '#52c41a',
      code: '52219',
      email: 'mylinh@gmail.com',
      ltv: '1.200.000 đ',
      bookingsCount: 1,
      diamonds: 10,
      frequency: 'N/A',
      gender: 'N/A',
      dob: '1999-12-05',
      daysAway: '15 ngày',
      favoriteDay: 'Thứ Sáu (1 lần)',
      oc: 'Hotline Agent',
      historyService: 'Nối mi Classic mới',
      historyBranch: 'Estella Place',
      historyCv: 'Cao Thanh Hằng',
      historyCcIn: 'Bích Phượng',
      historyCcOut: 'Bích Phượng',
      historyBooker: 'Hotline System',
      historyDate: 'T6, 15:05:00 12/6/2026',
      historyStatus: 'Hoàn thành',
      historyNote: 'Khách mới gọi hotline đặt lịch.'
    },
    {
      key: '4',
      customer: 'Phạm Phương Thảo',
      phone: '0966677788',
      group: 'single',
      promo: 'INTRO20',
      booker: 'Walk-in Cashier',
      createdTime: '13:50',
      avatarColor: '#13c2c2',
      code: '51330',
      email: 'thaopham@gmail.com',
      ltv: '3.500.000 đ',
      bookingsCount: 3,
      diamonds: 35,
      frequency: 'N/A',
      gender: 'N/A',
      dob: '1995-07-18',
      daysAway: '10 ngày',
      favoriteDay: 'Thứ Ba (1 lần)',
      oc: 'CS Combo Care',
      historyService: 'Uốn mi Collagen',
      historyBranch: 'Phan Xích Long',
      historyCv: 'Nguyễn Thuỳ Lâm',
      historyCcIn: 'Yến Vy',
      historyCcOut: 'Yến Vy',
      historyBooker: 'Walk-in Cashier',
      historyDate: 'T3, 13:50:00 2/7/2026',
      historyStatus: 'Hoàn thành',
      historyNote: 'Khách vãng lai vào tiệm.'
    },
    {
      key: '5',
      customer: 'Nguyễn Khánh Vy',
      phone: '0977788899',
      group: 'single',
      promo: null,
      booker: 'Web Portal',
      createdTime: '10:10',
      avatarColor: '#eb2f96',
      code: '52310',
      email: 'khanhvy@gmail.com',
      ltv: '0 đ',
      bookingsCount: 1,
      diamonds: 0,
      frequency: 'N/A',
      gender: 'N/A',
      dob: '2001-09-02',
      daysAway: '2 ngày',
      favoriteDay: 'Thứ Sáu (1 lần)',
      oc: 'None',
      historyService: 'Dặm mi Volume lẻ',
      historyBranch: 'Đề Thám',
      historyCv: 'Mai Hồng Ngọc',
      historyCcIn: 'Thu Thảo',
      historyCcOut: 'Thu Thảo',
      historyBooker: 'Web Portal',
      historyDate: 'T6, 10:10:00 10/7/2026',
      historyStatus: 'Hoàn thành',
      historyNote: 'Đặt online qua website.'
    },
    {
      key: '6',
      customer: 'Đỗ Thảo Nguyên',
      phone: '0988899900',
      group: 'single',
      promo: null,
      booker: 'Hotline System',
      createdTime: '09:12',
      avatarColor: '#faad14',
      code: '51888',
      email: 'thaonguyen@gmail.com',
      ltv: '2.400.000 đ',
      bookingsCount: 2,
      diamonds: 20,
      frequency: 'N/A',
      gender: 'N/A',
      dob: '1996-02-14',
      daysAway: '5 ngày',
      favoriteDay: 'Thứ Năm (1 lần)',
      oc: 'Hotline Agent',
      historyService: 'Nối mi thiết kế độc quyền',
      historyBranch: 'Đề Thám',
      historyCv: 'Cao Thanh Hằng',
      historyCcIn: 'Thu Thảo',
      historyCcOut: 'Thu Thảo',
      historyBooker: 'Hotline System',
      historyDate: 'T5, 09:12:00 9/7/2026',
      historyStatus: 'Hoàn thành',
      historyNote: 'Đặt qua hotline.'
    },
    {
      key: '7',
      customer: 'Tạ Linh Chi',
      phone: '0909988776',
      group: 'single',
      promo: 'PROMO10',
      booker: 'Zalo Chatbot',
      createdTime: '08:45',
      avatarColor: '#fa541c',
      code: '52002',
      email: 'linhchi@gmail.com',
      ltv: '1.500.000 đ',
      bookingsCount: 1,
      diamonds: 15,
      frequency: 'N/A',
      gender: 'N/A',
      dob: '1998-06-30',
      daysAway: '8 ngày',
      favoriteDay: 'Thứ Bảy (1 lần)',
      oc: 'None',
      historyService: 'Gói dưỡng mi cao cấp',
      historyBranch: 'Estella Place',
      historyCv: 'Nguyễn Thuỳ Lâm',
      historyCcIn: 'Bích Phượng',
      historyCcOut: 'Bích Phượng',
      historyBooker: 'Zalo Chatbot',
      historyDate: 'T7, 08:45:00 4/7/2026',
      historyStatus: 'Hoàn thành',
      historyNote: 'Đặt qua Zalo OA tự động.'
    }
  ]);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = dayjs();
      setLiveClock(now.format('HH:mm:ss - DD/MM/YYYY'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = useCallback(async (date: dayjs.Dayjs) => {
    setLoading(true);
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const response = await api.get('/dashboard/today', {
        params: { date: dateStr }
      });
      const data = response.data;
      setBranchesData(data.branchesData);
      setBookingsCombo(data.bookingsCombo);
      setBookingsOther(data.bookingsOther);
    } catch (err) {
      console.error('Fetch dashboard today error:', err);
      message.error('Lỗi khi tải dữ liệu vận hành thực tế!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedDate);
  }, [selectedDate, fetchDashboardData]);

  const handleRefresh = async () => {
    await fetchDashboardData(selectedDate);
    message.success('Đã làm mới dữ liệu vận hành từ cơ sở dữ liệu!');
  };

  const getBranchLabel = (key: string) => {
    if (key === 'detham') return 'Đề Thám';
    if (key === 'pxl') return 'PXL';
    if (key === 'estella') return 'Estella';
    return '';
  };

  const activeComingList = comingBranch === 'all'
    ? Object.keys(branchesData).flatMap(branchKey => 
        branchesData[branchKey].coming.map(item => ({
          ...item,
          branchName: getBranchLabel(branchKey)
        }))
      )
    : branchesData[comingBranch].coming.map(item => ({
        ...item,
        branchName: getBranchLabel(comingBranch)
      }));

  const activeShopData = shopBranch === 'all'
    ? {
        revLe: Object.values(branchesData).reduce((sum, b) => sum + b.revLe, 0),
        revCombo: Object.values(branchesData).reduce((sum, b) => sum + b.revCombo, 0),
        revProduct: Object.values(branchesData).reduce((sum, b) => sum + b.revProduct, 0),
        cc: Object.entries(branchesData).flatMap(([branchKey, b]) => 
          b.cc.map(item => ({ ...item, branchName: getBranchLabel(branchKey) }))
        ),
        cv: Object.entries(branchesData).flatMap(([branchKey, b]) => 
          b.cv.map(item => ({ ...item, branchName: getBranchLabel(branchKey) }))
        ),
        coming: []
      }
    : {
        ...branchesData[shopBranch],
        cc: branchesData[shopBranch].cc.map(item => ({ ...item, branchName: getBranchLabel(shopBranch) })),
        cv: branchesData[shopBranch].cv.map(item => ({ ...item, branchName: getBranchLabel(shopBranch) }))
      };

  const bookingColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => <Text type="secondary">{index + 1}</Text>
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: BookingData) => (
        <Space size="middle">
          <Avatar 
            src={record.avatar || undefined}
            style={{ 
              backgroundColor: record.avatarColor || '#D4A84B', 
              color: '#fff', 
              fontSize: '11px',
              fontWeight: 'bold' 
            }} 
            size="small"
          >
            {record.customer.trim().split(' ').pop()?.substring(0, 2).toUpperCase()}
          </Avatar>
          <strong>{record.customer}</strong>
        </Space>
      )
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (t: string) => <Text type="secondary">{t}</Text>
    },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      key: 'group',
      render: (g: 'combo_live' | 'combo_dead' | 'single') => {
        if (g === 'combo_live') return <Tag color="gold" style={{ fontWeight: 'bold' }}>combo live</Tag>;
        if (g === 'combo_dead') return <Tag color="error">combo dead</Tag>;
        return <Tag color="blue">single</Tag>;
      }
    },
    {
      title: 'Promo',
      dataIndex: 'promo',
      key: 'promo',
      render: (p: string | null) => p ? <Tag color="pink" style={{ fontSize: '10px' }}>{p}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: 'Booker',
      dataIndex: 'booker',
      key: 'booker',
      render: (b: string) => <span style={{ fontWeight: 500 }}>{b}</span>
    },
    {
      title: 'Created At',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (t: string) => <Text type="secondary">{t}</Text>
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: BookingData) => (
        <Button 
          size="small" 
          type="link" 
          icon={<EyeOutlined style={{ fontSize: '16px', color: '#D4A84B' }} />}
          onClick={() => openCustomerDrawer(record)}
          style={{ padding: 0 }}
        />
      )
    }
  ];

  const comingColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => <Text type="secondary">{index + 1}</Text>
    },
    {
      title: 'Giờ Hẹn',
      dataIndex: 'time',
      key: 'time',
      render: (t: string) => <strong style={{ color: '#D4A84B' }}>{t}</strong>
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (b: string) => <Tag color="cyan" style={{ fontWeight: 'bold' }}>{b}</Tag>
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: ComingClientData) => (
        <Space size="middle">
          <Avatar 
            src={record.avatar || undefined}
            style={{ 
              backgroundColor: record.avatarColor || '#D4A84B', 
              color: '#fff', 
              fontSize: '11px',
              fontWeight: 'bold' 
            }} 
            size="small"
          >
            {record.customer.trim().split(' ').pop()?.substring(0, 2).toUpperCase()}
          </Avatar>
          <strong>{record.customer}</strong>
        </Space>
      )
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (t: string) => <Text type="secondary">{t}</Text>
    },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      key: 'group',
      render: (g: 'combo_live' | 'combo_dead' | 'single') => {
        if (g === 'combo_live') return <Tag color="gold" style={{ fontWeight: 'bold' }}>combo live</Tag>;
        if (g === 'combo_dead') return <Tag color="error">combo dead</Tag>;
        return <Tag color="blue">single</Tag>;
      }
    },
    {
      title: 'Promo',
      dataIndex: 'promo',
      key: 'promo',
      render: (p: string | null) => p ? <Tag color="pink" style={{ fontSize: '10px' }}>{p}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: 'Booker',
      dataIndex: 'booker',
      key: 'booker',
      render: (b: string) => <span style={{ fontWeight: 500 }}>{b}</span>
    },
    {
      title: 'CC',
      dataIndex: 'cc',
      key: 'cc',
      render: (cc: string) => <strong style={{ color: '#1890ff' }}>{cc}</strong>
    },
    {
      title: 'CV',
      dataIndex: 'cv',
      key: 'cv',
      render: (cv: string) => <Tag color={cv === 'Nghỉ phép' ? 'red' : 'blue'}>{cv}</Tag>
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      align: 'right' as const,
      render: (status: 'arrived' | 'confirmed' | 'pending' | 'late') => renderComingStatus(status)
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: ComingClientData) => (
        <Button 
          size="small" 
          type="link" 
          icon={<EyeOutlined style={{ fontSize: '16px', color: '#D4A84B' }} />}
          onClick={() => openCustomerDrawer(record as any)}
          style={{ padding: 0 }}
        />
      )
    }
  ];

  // Render Status Badge for Coming Customer
  const renderComingStatus = (status: 'arrived' | 'confirmed' | 'pending' | 'late') => {
    switch (status) {
      case 'arrived':
        return <Tag color="success">Đang làm</Tag>;
      case 'confirmed':
        return <Tag color="processing">Đã xác nhận</Tag>;
      case 'pending':
        return <Tag color="warning">Chờ đến</Tag>;
      case 'late':
        return <Tag color="error">Đến muộn</Tag>;
      default:
        return <Tag color="default">Chờ xử lý</Tag>;
    }
  };

  const renderShiftAndAttendance = (shift: 'sáng' | 'chiều' | 'full' | 'off', attendance: 'none' | 'checked_in' | 'checked_out' | 'late') => {
    if (shift === 'off') {
      return (
        <Tooltip title="Nghỉ phép tuần">
          <Space size={6} style={{ cursor: 'help' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: '#bfbfbf', 
              verticalAlign: 'middle'
            }} />
            <span style={{ fontSize: '12px', color: '#bfbfbf', fontWeight: 500 }}>Off</span>
          </Space>
        </Tooltip>
      );
    }
    
    let shiftText = '';
    if (shift === 'sáng') shiftText = 'Sáng';
    else if (shift === 'chiều') shiftText = 'Chiều';
    else if (shift === 'full') shiftText = 'Full';

    let attText = '';
    let dotColor = '#bfbfbf';
    if (attendance === 'checked_in') {
      attText = 'Đã check-in';
      dotColor = '#52c41a'; // Green
    } else if (attendance === 'checked_out') {
      attText = 'Đã check-out';
      dotColor = '#8c8c8c'; // Gray
    } else if (attendance === 'late') {
      attText = 'Đi trễ';
      dotColor = '#ff4d4f'; // Red
    } else {
      attText = 'Chưa check-in';
      dotColor = '#faad14'; // Orange/Amber
    }

    return (
      <Tooltip title={`Ca ${shiftText} - ${attText}`}>
        <Space size={6} style={{ cursor: 'help' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            backgroundColor: dotColor, 
            verticalAlign: 'middle'
          }} />
          <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>{shiftText}</span>
        </Space>
      </Tooltip>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Control Header */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px 24px',
          background: themeMode === 'dark' ? '#141414' : '#fffbe6',
          borderRadius: '12px',
          border: `1px solid ${themeMode === 'dark' ? '#303030' : '#ffd666'}`
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: themeMode === 'dark' ? '#D4A84B' : '#873800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClockCircleOutlined /> Control Board Hôm Nay (Today operations)
          </Title>
          <Text style={{ fontSize: '13px', color: themeMode === 'dark' ? '#a6a6a6' : '#595959' }}>
            Giám sát thời gian thực lịch đặt mới, luồng khách đến và trạng thái phục vụ của CC & CV.
          </Text>
        </div>
        
        <Space size="middle">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: token.colorTextDescription }}>Thời gian thực tế</div>
            <strong style={{ color: '#D4A84B', fontSize: '14px' }}>{liveClock}</strong>
          </div>
          <Divider type="vertical" style={{ height: '32px', borderColor: themeMode === 'dark' ? '#303030' : '#d9d9d9' }} />
          <DatePicker 
            value={selectedDate} 
            onChange={(date) => date && setSelectedDate(date)} 
            format="DD/MM/YYYY" 
            allowClear={false}
            style={{ width: '140px' }}
          />
          <Button 
            type="primary" 
            icon={<SyncOutlined spin={loading} />} 
            onClick={handleRefresh}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000000', fontWeight: 'bold' }}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          
          {/* SECTION 1: BOOKING - CREATED TODAY */}
          <Col span={24}>
            <Card
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#52c41a' }} />
                  <span style={{ fontWeight: 'bold' }}>Booking Tạo Hôm Nay (Created Today)</span>
                </Space>
              }
              extra={
                <Badge 
                  count={bookingsCombo.length + bookingsOther.length} 
                  style={{ backgroundColor: '#52c41a' }}
                />
              }
              style={{ height: '100%', borderColor: token.colorBorderSecondary }}
            >
              <Tabs 
                activeKey={bookingTab} 
                onChange={(k: any) => setBookingTab(k)}
                items={[
                  {
                    key: 'combo',
                    label: `Combo (${bookingsCombo.length})`,
                    children: (
                      <Table
                        dataSource={bookingsCombo}
                        columns={bookingColumns}
                        size="small"
                        pagination={false}
                        bordered
                        className="antd-custom-table"
                      />
                    )
                  },
                  {
                    key: 'other',
                    label: `Khác (${bookingsOther.length})`,
                    children: (
                      <Table
                        dataSource={bookingsOther}
                        columns={bookingColumns}
                        size="small"
                        pagination={false}
                        bordered
                        className="antd-custom-table"
                      />
                    )
                  }
                ]}
              />
            </Card>
          </Col>

          <Col span={24}>
            <Card
              title={
                <Space>
                  <TeamOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontWeight: 'bold' }}>Lịch Khách Đến Hôm Nay (Coming Today)</span>
                </Space>
              }
              extra={
                <Radio.Group 
                  size="small" 
                  value={comingBranch} 
                  onChange={(e) => setComingBranch(e.target.value)}
                >
                  <Radio.Button value="all">ALL</Radio.Button>
                  <Radio.Button value="detham">Đề Thám (DT)</Radio.Button>
                  <Radio.Button value="pxl">PXL</Radio.Button>
                  <Radio.Button value="estella">Estella (EP)</Radio.Button>
                </Radio.Group>
              }
              style={{ height: '100%', borderColor: token.colorBorderSecondary }}
            >
              <Table
                dataSource={activeComingList}
                columns={comingColumns}
                size="small"
                pagination={false}
                bordered
                className="antd-custom-table"
              />
            </Card>
          </Col>

          {/* SECTION 3: SHOP CONTROL */}
          <Col span={24}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <Space>
                    <ShopOutlined style={{ color: '#D4A84B' }} />
                    <span style={{ fontWeight: 'bold' }}>Vận Hành Chi Nhánh (Shop Control Center)</span>
                  </Space>
                  
                  <Radio.Group 
                    value={shopBranch} 
                    onChange={(e) => setShopBranch(e.target.value)}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="all">ALL</Radio.Button>
                    <Radio.Button value="detham">Đề Thám (DT)</Radio.Button>
                    <Radio.Button value="pxl">Phan Xích Long (PXL)</Radio.Button>
                    <Radio.Button value="estella">Estella Place (EP)</Radio.Button>
                  </Radio.Group>
                </div>
              }
              style={{ borderColor: token.colorBorderSecondary }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Doanh thu breakdown cards */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: token.colorTextDescription, letterSpacing: '0.5px', marginBottom: '12px' }}>
                    Phân Phối Doanh Thu Hôm Nay (Revenue Breakdown)
                  </div>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      <Card size="small" style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#f5f5f5', border: `1px solid ${token.colorBorderSecondary}` }}>
                        <span style={{ fontSize: '11px', color: token.colorTextDescription }}>Doanh Thu Dịch Vụ Lẻ</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginTop: '4px' }}>
                          {activeShopData.revLe.toLocaleString('vi-VN')} đ
                        </div>
                      </Card>
                    </Col>
                    
                    <Col xs={24} md={8}>
                      <Card size="small" style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#f5f5f5', border: `1px solid ${token.colorBorderSecondary}` }}>
                        <span style={{ fontSize: '11px', color: '#D4A84B' }}>Doanh Thu Combo (Gói)</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#D4A84B', marginTop: '4px' }}>
                          {activeShopData.revCombo.toLocaleString('vi-VN')} đ
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} md={8}>
                      <Card size="small" style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#f5f5f5', border: `1px solid ${token.colorBorderSecondary}` }}>
                        <span style={{ fontSize: '11px', color: '#52c41a' }}>Doanh Thu Sản Phẩm</span>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a', marginTop: '4px' }}>
                          {activeShopData.revProduct.toLocaleString('vi-VN')} đ
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </div>

                {/* CC & CV Table split */}
                <Row gutter={[24, 24]}>
                  
                  {/* CV list */}
                  <Col xs={24} xl={12}>
                    <Card
                      title={
                        <Space>
                          <UserOutlined style={{ color: '#D4A84B' }} />
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>[CV] Chuyên viên đang làm gì? Bao nhiêu khách?</span>
                        </Space>
                      }
                      styles={{ body: { padding: 0 } }}
                      style={{ borderColor: token.colorBorderSecondary }}
                    >
                      <Table
                        dataSource={activeShopData.cv}
                        rowKey="name"
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: 'Ca',
                            key: 'shift_attendance',
                            render: (_, rec) => renderShiftAndAttendance(rec.shift, rec.attendance)
                          },
                          {
                            title: 'Tên CV',
                            dataIndex: 'name',
                            key: 'name',
                            render: (t) => <strong>{t}</strong>
                          },
                          {
                            title: 'Chi nhánh',
                            dataIndex: 'branchName',
                            key: 'branchName',
                            render: (b: string) => <Tag color="cyan" style={{ fontWeight: 'bold' }}>{b}</Tag>
                          },
                          {
                            title: 'Đang làm gì?',
                            dataIndex: 'doing',
                            key: 'doing',
                            render: (doing, rec) => (
                              <Badge 
                                status={rec.status === 'busy' ? 'warning' : 'success'} 
                                text={doing}
                              />
                            )
                          },
                          {
                            title: 'Khách hôm nay',
                            dataIndex: 'clients',
                            key: 'clients',
                            align: 'center',
                            render: (n) => <strong style={{ fontSize: '13px' }}>{n} khách</strong>
                          }
                        ]}
                        className="antd-custom-table"
                      />
                    </Card>
                  </Col>

                  {/* CC list */}
                  <Col xs={24} xl={12}>
                    <Card
                      title={
                        <Space>
                          <TeamOutlined style={{ color: '#D4A84B' }} />
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>[CC] Client Consultant đang làm gì? Bao nhiêu khách?</span>
                        </Space>
                      }
                      styles={{ body: { padding: 0 } }}
                      style={{ borderColor: token.colorBorderSecondary }}
                    >
                      <Table
                        dataSource={activeShopData.cc}
                        rowKey="name"
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: 'Ca',
                            key: 'shift_attendance',
                            render: (_, rec) => renderShiftAndAttendance(rec.shift, rec.attendance)
                          },
                          {
                            title: 'Tên CC',
                            dataIndex: 'name',
                            key: 'name',
                            render: (t) => <strong>{t}</strong>
                          },
                          {
                            title: 'Chi nhánh',
                            dataIndex: 'branchName',
                            key: 'branchName',
                            render: (b: string) => <Tag color="cyan" style={{ fontWeight: 'bold' }}>{b}</Tag>
                          },
                          {
                            title: 'Đang làm gì?',
                            dataIndex: 'doing',
                            key: 'doing',
                            render: (doing) => <Text type="secondary">{doing}</Text>
                          },
                          {
                            title: 'Khách hôm nay',
                            dataIndex: 'clients',
                            key: 'clients',
                            align: 'center',
                            render: (n) => <strong>{n} KH</strong>
                          },
                          {
                            title: 'Combo bán được',
                            dataIndex: 'combos',
                            key: 'combos',
                            align: 'center',
                            render: (n) => <Tag color="success">{n} Combo</Tag>
                          },
                          {
                            title: 'Doanh số ngày',
                            dataIndex: 'revenue',
                            key: 'revenue',
                            align: 'right',
                            render: (r: number) => <strong style={{ color: '#D4A84B' }}>{r.toLocaleString('vi-VN')} đ</strong>
                          }
                        ]}
                        className="antd-custom-table"
                      />
                    </Card>
                  </Col>

                </Row>

              </div>
            </Card>
          </Col>

        </Row>
      </Spin>

      {/* Customer Detail Drawer */}
      <Drawer
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={960}
        closable={false}
        styles={{
          body: {
            padding: 0,
            background: themeMode === 'dark' ? '#141414' : '#f5f5f5',
            color: themeMode === 'dark' ? '#fff' : '#000'
          }
        }}
      >
        {selectedCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff'
            }}>
              <Space size="middle">
                <Button 
                  type="text" 
                  icon={<CloseOutlined />} 
                  onClick={() => setDrawerVisible(false)} 
                  style={{ color: themeMode === 'dark' ? '#fff' : '#595959' }}
                />
                <Avatar 
                  size={48} 
                  style={{ 
                    backgroundColor: selectedCustomer.avatarColor || '#D4A84B', 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: '#fff'
                  }}
                >
                  {selectedCustomer.customer.split(' ').pop()?.substring(0, 2).toUpperCase()}
                </Avatar>
                <div>
                  <Space size="small" style={{ alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                      {selectedCustomer.customer}
                    </h3>
                    <Rate disabled defaultValue={4} style={{ fontSize: '12px', color: '#fadb14' }} />
                  </Space>
                  <div style={{ fontSize: '12px', color: themeMode === 'dark' ? '#a6a6a6' : '#595959', marginTop: '4px' }}>
                    <Text type="secondary">
                      📞 {selectedCustomer.phone} &nbsp;|&nbsp; 
                      <strong>Mã KH:</strong> {selectedCustomer.code || '52380'} &nbsp;|&nbsp; 
                      <strong>Email:</strong> {selectedCustomer.email || 'user52380@orb.local'}
                    </Text>
                  </div>
                </div>
              </Space>
              
              <Button 
                type="primary" 
                style={{ 
                  backgroundColor: '#D4A84B', 
                  borderColor: '#D4A84B', 
                  color: '#000', 
                  fontWeight: 'bold',
                  borderRadius: '6px'
                }}
              >
                Đặt Lịch Hẹn
              </Button>
            </div>

            {/* Drawer Body */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '24px', 
              display: 'grid', 
              gridTemplateColumns: '1fr 2fr', 
              gap: '24px' 
            }}>
              
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* CHỈ SỐ TÍCH LUỸ */}
                <Card 
                  title="📈 CHỈ SỐ TÍCH LUỸ" 
                  size="small" 
                  styles={{
                    header: { fontSize: '12px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#333' },
                    body: { padding: '16px' }
                  }}
                  style={{ 
                    borderColor: themeMode === 'dark' ? '#303030' : '#e8e8e8',
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff' 
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ 
                      background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>LTV (Doanh thu)</div>
                      <strong style={{ fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                        {selectedCustomer.ltv || '0 đ'}
                      </strong>
                    </div>
                    <div style={{ 
                      background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Tổng đặt lịch</div>
                      <strong style={{ fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                        {selectedCustomer.bookingsCount || 1}
                      </strong>
                    </div>
                    <div style={{ 
                      background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Kim cương còn lại</div>
                      <strong style={{ fontSize: '14px', color: '#1890ff' }}>
                        💎 {selectedCustomer.diamonds || 50}
                      </strong>
                    </div>
                    <div style={{ 
                      background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Tần suất (Avg)</div>
                      <strong style={{ fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                        {selectedCustomer.frequency || 'N/A'}
                      </strong>
                    </div>
                  </div>
                </Card>

                {/* THÔNG TIN CÁ NHÂN */}
                <Card 
                  title="👤 THÔNG TIN CÁ NHÂN" 
                  size="small" 
                  styles={{
                    header: { fontSize: '12px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#333' },
                    body: { padding: '16px' }
                  }}
                  style={{ 
                    borderColor: themeMode === 'dark' ? '#303030' : '#e8e8e8',
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Giới tính:</Text>
                      <strong style={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>{selectedCustomer.gender || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Ngày sinh:</Text>
                      <strong style={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>{selectedCustomer.dob || '2026-04-11'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Nhóm phân loại:</Text>
                      <Tag color={selectedCustomer.group === 'combo_live' ? 'gold' : selectedCustomer.group === 'combo_dead' ? 'error' : 'blue'}>
                        {selectedCustomer.group === 'combo_live' ? 'COMBO LIVE' : selectedCustomer.group === 'combo_dead' ? 'COMBO DEAD' : 'SINGLE'}
                      </Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Số ngày chưa quay lại:</Text>
                      <strong style={{ color: '#ff4d4f' }}>{selectedCustomer.daysAway || '2 ngày'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Thứ hay đi nhất:</Text>
                      <strong style={{ color: '#fa8c16' }}>{selectedCustomer.favoriteDay || 'Thứ Sáu (1 lần)'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Phụ trách (OC):</Text>
                      <strong style={{ color: '#1890ff' }}>{selectedCustomer.oc || 'Danny Wings'}</strong>
                    </div>
                  </div>
                </Card>

                {/* GÓI DỊCH VỤ ĐANG CHẠY */}
                <Card 
                  title="GÓI DỊCH VỤ ĐANG CHẠY" 
                  size="small" 
                  styles={{
                    header: { fontSize: '12px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#333' },
                    body: { padding: '16px' }
                  }}
                  style={{ 
                    borderColor: themeMode === 'dark' ? '#303030' : '#e8e8e8',
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff'
                  }}
                >
                  <p style={{ textAlign: 'center', color: '#bfbfbf', margin: 0, fontSize: '12px' }}>
                    Không có gói combo nào đang chạy.
                  </p>
                </Card>

                {/* GIỚI THIỆU KHÁCH HÀNG */}
                <Card 
                  title="GIỚI THIỆU KHÁCH HÀNG" 
                  size="small" 
                  styles={{
                    header: { fontSize: '12px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#333' },
                    body: { padding: '16px' }
                  }}
                  style={{ 
                    borderColor: themeMode === 'dark' ? '#303030' : '#e8e8e8',
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>ĐƯỢC GIỚI THIỆU BỞI</div>
                      <strong style={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>Tự đăng ký (Không có người giới thiệu)</strong>
                    </div>
                    <Divider style={{ margin: '8px 0', borderColor: themeMode === 'dark' ? '#303030' : '#f0f0f0' }} />
                    <div>
                      <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>DANH SÁCH ĐÃ GIỚI THIỆU (0)</div>
                      <span style={{ color: '#bfbfbf' }}>Chưa giới thiệu khách hàng nào.</span>
                    </div>
                  </div>
                </Card>

              </div>

              {/* Right Column */}
              <div style={{ 
                background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff', 
                padding: '24px', 
                borderRadius: '8px', 
                border: `1px solid ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                {/* Tabs inside drawer */}
                <Tabs 
                  defaultActiveKey="1"
                  items={[
                    {
                      key: '1',
                      label: `Lịch sử đặt lịch (1)`,
                      children: (
                        <div style={{ paddingTop: '16px', display: 'flex', gap: '16px' }}>
                          {/* Timeline node */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '50%', 
                              border: '2px solid #52c41a', 
                              background: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#52c41a' }} />
                            </div>
                            <div style={{ width: '2px', flexGrow: 1, background: themeMode === 'dark' ? '#303030' : '#f0f0f0', marginTop: '4px' }} />
                          </div>

                          {/* Timeline content */}
                          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: themeMode === 'dark' ? '#fff' : '#000' }}>
                                  {selectedCustomer.historyService || 'New Flawless Mink 1110'}
                                </h4>
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                                  CN: <strong>{selectedCustomer.historyBranch || 'Estella Place'}</strong> &nbsp;|&nbsp; 
                                  CV: <strong>{selectedCustomer.historyCv || 'Cẩm Tiên'}</strong>
                                </div>
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
                                  CC IN: <strong>{selectedCustomer.historyCcIn || 'Yến Vy'}</strong> &nbsp;|&nbsp; 
                                  CC OUT: <strong>{selectedCustomer.historyCcOut || 'Yến Vy'}</strong> &nbsp;|&nbsp; 
                                  BK: <strong>{selectedCustomer.historyBooker || 'Bích Phượng'}</strong>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <Text style={{ fontSize: '12px' }}>{selectedCustomer.historyDate || 'T6, 21:45:00 10/7/2026'}</Text>
                                <div style={{ marginTop: '4px' }}>
                                  <Tag color="success">{selectedCustomer.historyStatus || 'Hoàn thành'}</Tag>
                                </div>
                              </div>
                            </div>

                            {/* Note block */}
                            <div style={{ 
                              background: themeMode === 'dark' ? '#141414' : '#fafafa', 
                              padding: '16px', 
                              borderRadius: '8px', 
                              borderLeft: '4px solid #D4A84B',
                              fontSize: '12px',
                              fontStyle: 'italic',
                              lineHeight: '1.6',
                              color: themeMode === 'dark' ? '#d9d9d9' : '#595959'
                            }}>
                              {selectedCustomer.historyNote || 'Ghi chú đặt lịch: 10/7 gọi ĐXN đi chung với chị Phương 9/7 chị dời 8/7 đã ib nhắc lịch 5/7 c book, nối mới, đi 2 tính 1, đi với c Julia (0945951706), NHẮC LỊCH SỚM 1 NGÀY GIÚP ELM'}
                            </div>
                          </div>
                        </div>
                      )
                    },
                    {
                      key: '2',
                      label: `Nhật ký ghi chú (0)`,
                      children: <p style={{ color: '#bfbfbf', textAlign: 'center', padding: '24px' }}>Chưa có ghi chú nào.</p>
                    },
                    {
                      key: '3',
                      label: `Lịch sử cuộc gọi (3)`,
                      children: <p style={{ color: '#bfbfbf', textAlign: 'center', padding: '24px' }}>Chưa có cuộc gọi nào.</p>
                    }
                  ]}
                />
              </div>

            </div>

          </div>
        )}
      </Drawer>
    </div>
  );
}
