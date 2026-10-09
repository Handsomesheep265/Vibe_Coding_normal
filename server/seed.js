/**
 * 种子数据：首次启动（或 npm run seed）时写入 data/db.json。
 * 内存式 JSON 存储，删掉 data/db.json 重启即可恢复初始数据。
 */
"use strict";

const users = [
  { id: 1, account: "admin", password: "admin123", name: "系统管理员", role: "admin" },
  { id: 2, account: "3001", password: "123456", name: "张三", role: "student" },
  { id: 3, account: "3002", password: "123456", name: "李四", role: "student" },
];

const categories = [
  { id: 1, name: "iPhone", sort: 1, intro: "全新 iPhone 系列，性能与影像全面进阶。" },
  { id: 2, name: "Mac", sort: 2, intro: "Mac 产品线，自研芯片带来持久动力。" },
  { id: 3, name: "配件", sort: 3, intro: "AirPods、充电器与保护配件。" },
];

const products = [
  {
    id: 1,
    categoryId: 1,
    name: "iPhone 17 Pro",
    tagline: "迄今最强的 Pro 影像系统",
    image: "📱",
    basePrice: 899900,
    models: [
      { name: "iPhone 17 Pro", priceDelta: 0 },
      { name: "iPhone 17 Pro Max", priceDelta: 100000 },
    ],
    colors: [
      { name: "深蓝色" },
      { name: "银色" },
      { name: "星雾橙色" },
    ],
    storages: [
      { label: "256GB", priceDelta: 0 },
      { label: "512GB", priceDelta: 80000 },
      { label: "1TB", priceDelta: 160000 },
    ],
    stock: 12,
    status: "on",
    recommend: true,
  },
  {
    id: 2,
    categoryId: 1,
    name: "iPhone Air",
    tagline: "轻若无形，快得惊人",
    image: "📲",
    basePrice: 649900,
    models: [{ name: "iPhone Air", priceDelta: 0 }],
    colors: [
      { name: "天蓝色" },
      { name: "云白色" },
    ],
    storages: [
      { label: "256GB", priceDelta: 0 },
      { label: "512GB", priceDelta: 80000 },
    ],
    stock: 8,
    status: "on",
    recommend: true,
  },
  {
    id: 3,
    categoryId: 2,
    name: 'MacBook Neo 13 英寸',
    tagline: "快得轻巧，猛得耐用",
    image: "💻",
    basePrice: 549900,
    models: [
      { name: "MacBook Neo", priceDelta: 0 },
      { name: "MacBook Neo 高速款", priceDelta: 150000 },
    ],
    colors: [
      { name: "靛蓝色" },
      { name: "银色" },
    ],
    storages: [
      { label: "256GB", priceDelta: 0 },
      { label: "512GB", priceDelta: 100000 },
    ],
    stock: 5,
    status: "on",
    recommend: true,
  },
  {
    id: 4,
    categoryId: 3,
    name: "AirPods Pro 3",
    tagline: "主动降噪，声声入耳",
    image: "🎧",
    basePrice: 149900,
    models: [{ name: "AirPods Pro 3", priceDelta: 0 }],
    colors: [{ name: "白色" }],
    storages: [{ label: "标准版", priceDelta: 0 }],
    stock: 40,
    status: "on",
    recommend: false,
  },
  {
    id: 5,
    categoryId: 3,
    name: "MagSafe 充电器",
    tagline: "一贴即充",
    image: "🔌",
    basePrice: 19900,
    models: [{ name: "MagSafe 充电器", priceDelta: 0 }],
    colors: [{ name: "白色" }],
    storages: [{ label: "1m", priceDelta: 0 }],
    stock: 0,
    status: "on",
    recommend: false,
  },
  {
    id: 6,
    categoryId: 3,
    name: "iPhone MagSafe 保护壳",
    tagline: "轻薄耐磨，手感细腻",
    image: "🛡️",
    basePrice: 19900,
    models: [{ name: "iPhone 17 Pro 适用", priceDelta: 0 }],
    colors: [
      { name: "深蓝色" },
      { name: "透明" },
    ],
    storages: [{ label: "标准版", priceDelta: 0 }],
    stock: 60,
    status: "on",
    recommend: false,
  },
];

// 购物袋：3001 有 3 条，其中"保护壳"未勾选；3002 有 1 条
const carts = [
  {
    userId: 2,
    items: [
      { id: 101, productId: 1, model: "iPhone 17 Pro", color: "深蓝色", storage: "256GB", unitPrice: 899900, qty: 1, selected: true },
      { id: 102, productId: 4, model: "AirPods Pro 3", color: "白色", storage: "标准版", unitPrice: 149900, qty: 2, selected: true },
      { id: 103, productId: 6, model: "iPhone 17 Pro 适用", color: "深蓝色", storage: "标准版", unitPrice: 19900, qty: 1, selected: false },
    ],
  },
  {
    userId: 3,
    items: [
      { id: 201, productId: 2, model: "iPhone Air", color: "天蓝色", storage: "256GB", unitPrice: 649900, qty: 1, selected: true },
    ],
  },
];

const orders = [
  {
    id: 20260901001,
    userId: 2,
    items: [
      { productId: 4, name: "AirPods Pro 3", model: "AirPods Pro 3", color: "白色", storage: "标准版", unitPrice: 149900, qty: 1 },
    ],
    total: 149900,
    status: "已完成",
    address: { receiver: "张三", phone: "13800000001", detail: "华南理工大学 1栋502" },
    createdAt: "2026-08-20T10:00:00.000Z",
  },
  {
    id: 20260901002,
    userId: 3,
    items: [
      { productId: 3, name: "MacBook Neo 13 英寸", model: "MacBook Neo", color: "靛蓝色", storage: "256GB", unitPrice: 549900, qty: 1 },
    ],
    total: 549900,
    status: "待付款",
    address: { receiver: "李四", phone: "13800000002", detail: "华南理工大学 3栋301" },
    createdAt: "2026-08-28T09:30:00.000Z",
  },
];

const favorites = [
  { userId: 2, productIds: [3, 4] },
  { userId: 3, productIds: [1] },
];

module.exports = { users, categories, products, carts, orders, favorites };
