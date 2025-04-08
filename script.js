/* 全局样式 */
:root {
  --primary-color: #F8BBD0; /* 淡粉色主题色 */
  --primary-dark: #F48FB1;
  --primary-light: #FCE4EC;
  --primary-text: #212121;
  --secondary-text: #757575;
  --divider-color: #EEEEEE;
  --accent-color: #FF4081;
  --background-color: #FFFFFF;
  --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  --transition-speed: 0.3s;
}

body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: var(--primary-text);
  background-color: var(--background-color);
}

.container-fluid {
  height: 100vh;
  overflow: hidden;
}

.row {
  height: 100%;
}

/* 侧边栏样式 */
.sidebar {
  height: 100%;
  background-color: #ffffff;
  border-right: 1px solid var(--divider-color);
  overflow-y: auto;
  z-index: 1000;
  transition: transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.05);
}

.anime-list-container, .guide-list-container {
  height: calc(100vh - 200px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--primary-color) transparent;
}

.anime-list-container::-webkit-scrollbar, 
.guide-list-container::-webkit-scrollbar {
  width: 5px;
}

.anime-list-container::-webkit-scrollbar-thumb, 
.guide-list-container::-webkit-scrollbar-thumb {
  background-color: var(--primary-color);
  border-radius: 10px;
}

#anime-list, #guide-list {
  max-height: 100%;
}

.anime-item, .location-item, .guide-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--divider-color);
  cursor: pointer;
  transition: all var(--transition-speed) ease;
  border-radius: 8px;
  margin-bottom: 5px;
}

.anime-item:hover, .location-item:hover, .guide-item:hover {
  background-color: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: var(--card-shadow);
}

.anime-item.active, .guide-item.active {
  background-color: var(--primary-light);
  border-left: 3px solid var(--primary-dark);
}

.location-info, .guide-info {
  flex: 1;
  padding-left: 10px;
}

.location-name, .guide-name {
  font-weight: 500;
  margin: 0;
  color: var(--primary-text);
}

.location-address, .guide-description {
  font-size: 0.9em;
  color: var(--secondary-text);
  margin: 2px 0 0;
}

.anime-cover, .guide-icon {
  width: 45px;
  height: 45px;
  border-radius: 8px;
  object-fit: cover;
  margin-right: 12px;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.anime-item:hover .anime-cover,
.guide-item:hover .guide-icon {
  transform: scale(1.05);
}

.anime-info, .guide-info {
  flex: 1;
}

.anime-name, .guide-name {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.anime-points, .guide-points {
  font-size: 12px;
  color: var(--secondary-text);
  margin: 0;
}

/* 加载指示器样式 */
.loading-indicator {
  display: flex;
  justify-content: center;
  padding: 15px 0;
  width: 100%;
}

.loading-indicator::after {
  content: "";
  width: 30px;
  height: 30px;
  border: 3px solid var(--primary-light);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s ease-in-out infinite;
}

.load-more-indicator {
  text-align: center;
  padding: 10px 0;
  font-size: 12px;
  color: var(--secondary-text);
  width: 100%;
}

.no-results {
  text-align: center;
  padding: 20px 0;
  color: var(--secondary-text);
  font-style: italic;
}

/* 地图样式 */
#map {
  height: 100vh;
  width: 100%;
  z-index: 1;
}

/* 信息卡片样式 */
.info-card {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 90%;
  max-width: 500px;
  z-index: 1000;
  box-shadow: var(--card-shadow);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: none;
  background-color: rgba(255, 255, 255, 0.98);
}

.info-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

/* 评论区样式 */
.comments-container {
  border-top: 1px solid var(--divider-color);
  padding-top: 1rem;
}

.comments-container.show {
  display: block !important;
  animation: fadeIn 0.3s ease;
}

/* 修复评论区高度问题 */
.giscus {
  min-height: 300px;
  height: auto;
  min-height: 300px;
  width: 100%;
}

/* 番剧名称链接样式 */
.anime-link {
  color: var(--primary-text);
  text-decoration: none;
  transition: all 0.2s ease;
  display: inline-block;
  font-weight: 500;
}

.anime-link:hover {
  color: var(--accent-color);
  transform: translateY(-1px);
}

.anime-time {
  font-size: 12px;
  color: var(--secondary-text);
  margin-top: 4px;
  display: block;
}

/* 确保卡片文本显示 */
.card-text {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--primary-text);
  font-size: 14px;
}

.btn-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.btn-close:hover {
  opacity: 1;
}

.map-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.map-links .btn {
  transition: all 0.2s ease;
  border-radius: 20px;
  font-size: 0.85rem;
}

.map-links .btn:hover {
  transform: translateY(-2px);
}

/* 地图控制按钮 */
.map-controls {
  position: absolute;
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 8px;
  background-color: white;
  padding: 8px;
  border-radius: 25px;
  box-shadow: var(--card-shadow);
  transition: all 0.3s ease;
}

.map-controls .btn {
  border-radius: 20px;
  padding: 8px 15px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.map-controls .btn-primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #333;
}

.map-controls .btn-primary:hover {
  background-color: var(--primary-dark);
  border-color: var(--primary-dark);
}

.map-controls .btn-outline-primary {
  color: #333;
  border-color: var(--primary-color);
}

.map-controls .btn-outline-primary:hover {
  background-color: var(--primary-light);
  color: #333;
}

/* 地图源选择控件 - 修复显示问题 */
.map-source-control {
  background-color: white;
  border-radius: 8px;
  position: relative;
  box-shadow: var(--card-shadow);
  z-index: 1001; /* 确保控件在地图上方 */
}

.map-source-button {
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  text-decoration: none;
  font-size: 18px;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.map-source-button:hover {
  background-color: var(--primary-light);
}

.map-source-dropdown {
  display: none;
  position: absolute;
  top: 42px;
  right: 0;
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  z-index: 1002; /* 确保下拉菜单在控件上方 */
  width: 200px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 0;
}

.map-source-dropdown.show {
  display: block;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.map-source-option {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  color: #333;
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 14px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.map-source-option:hover {
  background-color: var(--primary-light);
}

.map-source-option.active {
  background-color: var(--primary-light);
  color: var(--accent-color);
  font-weight: 500;
}

.map-source-option:last-child {
  border-bottom: none;
}

.map-source-category {
  padding: 5px 15px;
  font-size: 12px;
  color: var(--secondary-text);
  font-weight: 600;
  text-transform: uppercase;
  margin-top: 5px;
}

.map-source-option.active {
  background-color: var(--primary-light);
  color: var(--accent-color);
}

/* 自定义地图标记 */
.custom-marker {
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.custom-marker:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
}

.anime-marker {
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transition: all 0.2s ease;
}

.anime-marker:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
}

/* 指南标记点样式 */
.guide-marker {
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 12px;
  transition: all 0.2s ease;
}

.guide-marker:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
}

/* 指南连线样式 */
.guide-path {
  stroke-dasharray: 5, 5;
  animation: dash 20s linear infinite;
  transition: stroke 0.3s ease;
}

@keyframes dash {
  to {
    stroke-dashoffset: -1000;
  }
}

/* 指南列表样式 */
.guide-item {
  border-left: 3px solid var(--primary-color);
}

.guide-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-light);
  color: var(--primary-dark);
  font-size: 20px;
}

.guide-points-list {
  max-height: 300px;
  overflow-y: auto;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.guide-point-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--divider-color);
  transition: all 0.2s ease;
}

.guide-point-item:hover {
  background-color: var(--primary-light);
}

.guide-point-item .point-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  font-size: 12px;
  font-weight: bold;
  margin-right: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.guide-point-item .point-image {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  object-fit: cover;
  margin-right: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.guide-point-item:hover .point-image {
  transform: scale(1.05);
}

.guide-point-item .point-info {
  flex: 1;
}

.guide-point-item .point-name {
  font-weight: 500;
  margin: 0;
}

.guide-point-item .point-anime {
  font-size: 12px;
  color: var(--secondary-text);
  margin: 0;
}

.guide-point-item .point-actions {
  display: flex;
  gap: 5px;
}

/* L2D站娘容器样式 - 修复显示问题 */
.l2d-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 300px;
  height: 400px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 移除d-none默认类，让机器人默认显示 */
.l2d-container:not(.d-none) {
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.l2d-container.minimized {
  transform: translateY(calc(100% - 50px));
}

.l2d-canvas-container {
  flex: 1;
  width: 100%;
  background-color: rgba(252, 228, 236, 0.5); /* 淡粉色背景 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.l2d-chat {
  height: 150px;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--divider-color);
}

.l2d-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  font-size: 14px;
}

.l2d-message {
  margin-bottom: 8px;
  padding: 8px 12px;
  border-radius: 18px;
  max-width: 80%;
  word-break: break-word;
  animation: message-pop 0.3s ease;
}

@keyframes message-pop {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.l2d-message.user {
  background-color: var(--primary-light);
  margin-left: auto;
  border-bottom-right-radius: 4px;
}

.l2d-message.assistant {
  background-color: #f4f4f4;
  margin-right: auto;
  border-bottom-left-radius: 4px;
}

.l2d-input-container {
  display: flex;
  gap: 5px;
  padding: 8px;
  border-top: 1px solid var(--divider-color);
}

.l2d-toggle-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #333;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.l2d-toggle-btn:hover {
  background-color: var(--primary-dark);
  transform: scale(1.05);
}

/* 移动端适配 */
.mobile-toggle {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 1100;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #333;
  box-shadow: var(--card-shadow);
  display: none; /* 默认隐藏 */
}

@media (min-width: 769px) {
  .mobile-toggle {
    display: none !important; /* 非移动设备强制不显示 */
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 80%;
    max-width: 300px;
    transform: translateX(-100%);
    box-shadow: 5px 0 15px rgba(0, 0, 0, 0.1);
  }
  
  .sidebar.show {
    transform: translateX(0);
  }
  
  .mobile-toggle {
    display: flex !important; /* 移动设备显示 */
  }
  
  .info-card {
    width: 90%;
    max-width: none;
    left: 5%;
    right: 5%;
  }
  
  .map-controls {
    bottom: 15px;
  }
  
  .l2d-container {
    width: 250px;
    height: 350px;
    bottom: 10px;
    right: 10px;
  }
  
  .l2d-container.minimized {
    transform: translateY(calc(100% - 40px));
  }
}

/* 加载动画 */
.load-more-indicator {
  text-align: center;
  padding: 15px 0;
  font-size: 14px;
  color: var(--secondary-text);
}

.load-more-indicator::after {
  content: "...";
  animation: dotPulse 1.5s infinite;
}

@keyframes dotPulse {
  0% { content: "."; }
  33% { content: ".."; }
  66% { content: "..."; }
}

.no-results {
  text-align: center;
  padding: 20px 0;
  color: var(--secondary-text);
  font-style: italic;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 搜索结果样式 */
.search-section {
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease;
}

.search-category {
  font-size: 14px;
  color: var(--secondary-text);
  margin: 10px 0;
  padding: 5px 0;
  border-bottom: 1px solid var(--divider-color);
}

.search-results-container {
  display: flex;
  flex-direction: column;
}

.search-results-group {
  margin-bottom: 15px;
  animation: fadeIn 0.3s ease;
}

.search-results-group-title {
  font-size: 13px;
  color: var(--secondary-text);
  padding: 8px 12px;
  background-color: var(--primary-light);
  border-radius: 8px;
  margin-bottom: 10px;
}

.location-item,
.point-item {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 6px;
  transition: all 0.2s ease;
}

.point-cover {
  width: 45px;
  height: 45px;
  border-radius: 8px;
  object-fit: cover;
  margin-right: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.location-item:hover .point-cover,
.point-item:hover .point-cover {
  transform: scale(1.05);
}

.point-info {
  flex: 1;
}

.location-item:hover,
.point-item:hover {
  background-color: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: var(--card-shadow);
}

.location-name,
.point-name {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-address,
.anime-title {
  font-size: 12px;
  color: var(--secondary-text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 分享指南样式 */
#qrcode-container {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

#qrcode-container canvas {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 导入指南样式 */
.import-guide-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.import-guide-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 24px;
  margin-right: 15px;
  background-color: var(--primary-light);
  color: var(--primary-dark);
}

.import-guide-title {
  font-weight: 500;
  margin: 0 0 5px 0;
}

.import-guide-meta {
  font-size: 12px;
  color: var(--secondary-text);
}

.import-guide-description {
  margin-bottom: 15px;
  font-size: 14px;
  color: var(--primary-text);
}

.import-guide-points {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.import-point-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--divider-color);
  transition: all 0.2s ease;
}

.import-point-item:hover {
  background-color: var(--primary-light);
  transform: translateX(2px);
}

.import-point-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.import-point-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  font-size: 10px;
  font-weight: bold;
  margin-right: 10px;
}

.import-point-name {
  font-weight: 500;
  margin: 0;
  font-size: 14px;
}

.import-point-anime {
  font-size: 12px;
  color: var(--secondary-text);
  margin: 0;
}

/* 按钮样式全局美化 */
.btn {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #333;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
  border-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-outline-primary {
  color: #333;
  border-color: var(--primary-color);
}

.btn-outline-primary:hover {
  background-color: var(--primary-light);
  color: #333;
  transform: translateY(-2px);
}

/* 表单元素全局美化 */
.form-control {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  padding: 10px 15px;
  transition: all 0.2s ease;
}

.form-control:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(248, 187, 208, 0.25);
}

/* 页面切换淡入淡出动画 */
.fade-enter {
  opacity: 0;
}

.fade-enter-active {
  opacity: 1;
  transition: opacity 0.3s ease;
}

.fade-exit {
  opacity: 1;
}

.fade-exit-active {
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* 模态框动画 */
.modal.fade .modal-dialog {
  transition: transform 0.3s ease-out;
  transform: scale(0.95);
}

.modal.show .modal-dialog {
  transform: none;
}

.modal-content {
  border-radius: 12px;
  border: none;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.modal-header {
  border-bottom: 1px solid var(--divider-color);
}

.modal-footer {
  border-top: 1px solid var(--divider-color);
}