/**
 * 滑动操作和右键菜单功能
 * 为巡礼点列表项添加iOS风格的滑动操作菜单和桌面版右键菜单
 */

// 全局变量
let activeSwipeItem = null; // 当前激活的滑动项
let contextMenu = null; // 右键菜单元素
let touchStartX = 0; // 触摸开始位置
let touchStartY = 0; // 触摸开始位置
let isSwiping = false; // 是否正在滑动
let swipeThreshold = 50; // 滑动阈值

// 获取当前计算的菜单宽度
function getComputedMenuWidth() {
  // 获取CSS变量值
  const computedStyle = getComputedStyle(document.documentElement);
  const menuWidth = computedStyle.getPropertyValue('--swipe-action-width');

  // 如果能获取到数值，则转换为数字
  if (menuWidth) {
    const width = parseInt(menuWidth);
    if (!isNaN(width)) {
      return width;
    }
  }

  // 默认值
  return window.innerWidth <= 375 ? 160 : (window.innerWidth <= 768 ? 180 : 200);
}

// 初始化函数
function initSwipeActions() {
  console.log('初始化滑动操作功能');

  // 创建右键菜单
  createContextMenu();

  // 添加全局事件监听
  document.addEventListener('click', handleGlobalClick);

  // 监听动态添加的巡礼点列表项
  observePointItems();
}

// 创建右键菜单
function createContextMenu() {
  // 如果已存在，则移除
  if (contextMenu) {
    document.body.removeChild(contextMenu);
  }

  // 创建菜单元素
  contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  contextMenu.style.display = 'none';

  // 添加菜单项
  contextMenu.innerHTML = `
    <div class="context-menu-item action-guide">
      <i class="bi bi-bookmark-plus"></i> 添加到指南
    </div>
    <div class="context-menu-item action-compare">
      <i class="bi bi-images"></i> 对比图
    </div>
    <div class="context-menu-item action-apple-maps">
      <i class="bi bi-apple"></i> 苹果地图
    </div>
  `;

  // 添加到文档
  document.body.appendChild(contextMenu);

  // 添加菜单项点击事件
  contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', handleContextMenuItemClick);
  });
}

// 处理右键菜单项点击
function handleContextMenuItemClick(e) {
  const action = e.currentTarget.classList[1]; // 获取操作类型
  const pointItem = contextMenu.pointItem; // 获取关联的巡礼点项

  if (pointItem && action) {
    executeAction(action, pointItem);
  }

  // 隐藏菜单
  hideContextMenu();
}

// 隐藏右键菜单
function hideContextMenu() {
  if (contextMenu) {
    contextMenu.style.display = 'none';
  }
}

// 显示右键菜单
function showContextMenu(x, y, pointItem) {
  if (!contextMenu) return;

  // 设置位置
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.style.display = 'block';

  // 存储关联的巡礼点项
  contextMenu.pointItem = pointItem;

  // 确保菜单不超出视口
  const rect = contextMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    contextMenu.style.left = `${window.innerWidth - rect.width - 5}px`;
  }
  if (rect.bottom > window.innerHeight) {
    contextMenu.style.top = `${window.innerHeight - rect.height - 5}px`;
  }
}

// 处理全局点击事件
function handleGlobalClick(e) {
  // 如果点击的不是右键菜单，则隐藏菜单
  if (contextMenu && !contextMenu.contains(e.target)) {
    hideContextMenu();
  }

  // 如果点击的不是当前激活的滑动项，则重置所有滑动项
  if (activeSwipeItem && !activeSwipeItem.contains(e.target)) {
    resetAllSwipeItems();
  }
}

// 重置所有滑动项
function resetAllSwipeItems() {
  document.querySelectorAll('.swipe-content').forEach(content => {
    content.style.transform = 'translateX(0)';
    // 同时隐藏相应的滑动菜单
    const container = content.closest('.swipe-container');
    if (container) {
      const actions = container.querySelector('.swipe-actions');
      if (actions) {
        actions.style.transform = 'translateX(100%)';
      }
    }
  });
  activeSwipeItem = null;
}

// 观察巡礼点列表项的添加
function observePointItems() {
  // 使用MutationObserver监听DOM变化
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          // 检查是否是巡礼点列表项
          if (node.nodeType === 1 && (node.classList.contains('point-item') || node.querySelector('.point-item'))) {
            // 如果是列表项本身
            if (node.classList.contains('point-item')) {
              setupSwipeItem(node);
            }
            // 如果是包含列表项的容器
            else {
              node.querySelectorAll('.point-item').forEach(item => {
                setupSwipeItem(item);
              });
            }
          }
        });
      }
    });
  });

  // 开始观察
  observer.observe(document.body, { childList: true, subtree: true });

  // 处理已存在的巡礼点列表项
  document.querySelectorAll('.point-item').forEach(item => {
    setupSwipeItem(item);
  });
}

// 设置滑动项
function setupSwipeItem(pointItem) {
  // 检查是否已经设置过
  if (pointItem.querySelector('.swipe-container')) return;

  // 保存原始内容
  const originalContent = pointItem.innerHTML;

  // 清空原始内容
  pointItem.innerHTML = '';

  // 创建滑动容器结构
  const swipeContainer = document.createElement('div');
  swipeContainer.className = 'swipe-container';

  // 创建滑动内容
  const swipeContent = document.createElement('div');
  swipeContent.className = 'swipe-content';
  swipeContent.innerHTML = originalContent;

  // 创建滑动操作菜单
  const swipeActions = document.createElement('div');
  swipeActions.className = 'swipe-actions';
  swipeActions.innerHTML = `
    <button class="swipe-action-btn action-guide" title="添加到指南">
      <i class="bi bi-bookmark-plus"></i>
    </button>
    <button class="swipe-action-btn action-compare" title="对比图">
      <i class="bi bi-images"></i>
    </button>
    <button class="swipe-action-btn action-apple-maps" title="苹果地图">
      <i class="bi bi-apple"></i>
    </button>
  `;

  // 确保滑动菜单默认隐藏
  swipeActions.style.transform = 'translateX(100%)';
  swipeContent.style.transform = 'translateX(0)';


  // 创建滑动提示
  const swipeHint = document.createElement('div');
  swipeHint.className = 'swipe-hint';
  swipeHint.innerHTML = '<i class="bi bi-chevron-left"></i> 左滑操作';

  // 只在移动端的抽屉中显示滑动提示
  const isMobile = window.innerWidth <= 768;
  const isInDrawer = pointItem.closest('#mobile-drawer') !== null;

  if (isMobile && isInDrawer) {
    // 只在移动端抽屉中添加滑动提示
    swipeContent.appendChild(swipeHint);

    // 随机决定是否显示滑动提示，增加用户注意力
    if (Math.random() < 0.5) {
      setTimeout(() => {
        swipeHint.style.opacity = '0.95';
        setTimeout(() => {
          swipeHint.style.opacity = '0';
        }, 3000);
      }, 500);
    }
  }

  // 组装结构
  swipeContainer.appendChild(swipeActions);
  swipeContainer.appendChild(swipeContent);
  pointItem.appendChild(swipeContainer);

  // 添加触摸事件（移动端）
  setupTouchEvents(pointItem, swipeContent);

  // 添加右键菜单事件（桌面端）
  setupContextMenuEvent(pointItem);

  // 添加操作按钮点击事件
  setupActionButtons(pointItem, swipeActions);
}

// 设置触摸事件
function setupTouchEvents(pointItem, swipeContent) {
  // 触摸开始
  pointItem.addEventListener('touchstart', e => {
    // 获取初始触摸位置
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = false;
  }, { passive: true });

  // 触摸移动
  pointItem.addEventListener('touchmove', e => {
    if (e.touches.length > 1) return; // 忽略多点触摸

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY;

    // 判断是否为水平滑动
    if (!isSwiping) {
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isSwiping = true;
      } else if (Math.abs(diffY) > 10) {
        return; // 垂直滑动，不处理
      }
    }

    if (isSwiping) {
      // 获取滑动容器
      const container = swipeContent.closest('.swipe-container');
      if (!container) return;

      // 获取滑动菜单元素
      const actions = container.querySelector('.swipe-actions');
      if (!actions) return;

      // 获取当前变换值
      let currentTransform = 0;
      const transformValue = swipeContent.style.transform;
      if (transformValue) {
        const match = transformValue.match(/translateX\(([^)]+)\)/);
        if (match && match[1]) {
          currentTransform = parseInt(match[1]);
        }
      }

      // 判断是否已经展开
      const isExpanded = currentTransform <= -100;

      // 允许向左滑动和向右滑动
      let translateX;

      // 获取当前滑动菜单宽度
      const menuWidth = getComputedMenuWidth();

      if (isExpanded) {
        // 如果已经展开，则允许向右滑动收起
        translateX = Math.min(diffX - menuWidth, 0);
      } else {
        // 如果未展开，则向左滑动展开
        translateX = Math.max(diffX, -menuWidth);
      }

      // 设置内容位置
      swipeContent.style.transform = `translateX(${translateX}px)`;

      // 计算菜单位置 - 使用动态菜单宽度
      const actionsTranslateX = 100 - Math.min(100 * (Math.abs(translateX) / menuWidth), 100);
      actions.style.transform = `translateX(${actionsTranslateX}%)`;

      // 阻止页面滚动
      e.preventDefault();
    }
  }, { passive: false });

  // 触摸结束
  pointItem.addEventListener('touchend', e => {
    if (!isSwiping) return;

    // 获取滑动容器
    const container = swipeContent.closest('.swipe-container');
    if (!container) return;

    // 获取滑动菜单元素
    const actions = container.querySelector('.swipe-actions');
    if (!actions) return;

    // 获取当前滑动距离
    let swipeDistance = 0;
    const transformValue = swipeContent.style.transform;
    if (transformValue) {
      const match = transformValue.match(/translateX\(([^)]+)\)/);
      if (match && match[1]) {
        swipeDistance = parseInt(match[1]);
      }
    }

    // 判断是否已经展开
    const isExpanded = swipeDistance <= -100;

    // 获取当前滑动菜单宽度
    const menuWidth = getComputedMenuWidth();

    // 如果已经展开，判断是否要收起
    if (isExpanded) {
      // 如果向右滑动超过阈值，则收起
      if (swipeDistance > -menuWidth + swipeThreshold) {
        swipeContent.style.transform = 'translateX(0)';
        actions.style.transform = 'translateX(100%)';
        activeSwipeItem = null;
      } else {
        // 否则保持展开
        swipeContent.style.transform = `translateX(-${menuWidth}px)`;
        actions.style.transform = 'translateX(0)';
        activeSwipeItem = pointItem;
      }
    } else {
      // 如果未展开，判断是否要展开
      if (swipeDistance < -swipeThreshold) {
        swipeContent.style.transform = `translateX(-${menuWidth}px)`;
        actions.style.transform = 'translateX(0)';
        activeSwipeItem = pointItem;
      } else {
        // 否则恢复原位
        swipeContent.style.transform = 'translateX(0)';
        actions.style.transform = 'translateX(100%)';
        activeSwipeItem = null;
      }
    }

    // 添加点击外部关闭菜单的事件
    if (activeSwipeItem) {
      // 添加一次性点击事件关闭菜单
      setTimeout(() => {
        document.addEventListener('touchstart', function closeMenu(evt) {
          // 如果点击的不是当前激活的滑动项或其子元素
          if (activeSwipeItem && !activeSwipeItem.contains(evt.target)) {
            // 重置所有滑动项
            resetAllSwipeItems();
          }
          // 移除事件监听器，确保只触发一次
          document.removeEventListener('touchstart', closeMenu);
        });
      }, 100);
    }
  });
}

// 设置右键菜单事件
function setupContextMenuEvent(pointItem) {
  pointItem.addEventListener('contextmenu', e => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, pointItem);
  });
}

// 设置操作按钮点击事件
function setupActionButtons(pointItem, swipeActions) {
  swipeActions.querySelectorAll('.swipe-action-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation(); // 阻止冒泡，避免触发列表项点击事件

      const action = btn.classList[1]; // 获取操作类型
      executeAction(action, pointItem);

      // 重置滑动状态
      setTimeout(() => {
        resetAllSwipeItems();
      }, 300);
    });
  });
}

// 执行操作
function executeAction(action, pointItem) {
  // 获取巡礼点数据
  const pointId = pointItem.dataset.id || pointItem.dataset.pointId;
  const animeId = pointItem.dataset.animeId;

  // 如果没有数据，尝试从DOM结构中获取
  let pointData = null;
  let animeData = null;

  // 尝试从全局变量中获取数据
  if (window.allAnimeData && animeId && window.allAnimeData[animeId]) {
    animeData = window.allAnimeData[animeId];

    // 查找对应的巡礼点
    if (animeData.points) {
      pointData = animeData.points.find(p => p.id === pointId);
    }
  }

  // 如果没有找到数据，尝试从DOM结构中获取基本信息
  if (!pointData) {
    const pointName = pointItem.querySelector('.point-name')?.textContent;
    const animeName = pointItem.querySelector('.anime-title')?.textContent;

    // 模拟点击该巡礼点，触发原有的点击事件
    pointItem.click();

    // 根据操作类型执行相应的操作
    switch (action) {
      case 'action-guide':
        // 点击添加到指南按钮
        document.getElementById('add-to-guide-btn')?.click();
        break;

      case 'action-compare':
        // 点击对比图按钮
        document.getElementById('compare-link')?.click();
        break;

      case 'action-apple-maps':
        // 点击苹果地图按钮
        document.getElementById('apple-maps-link')?.click();
        break;
    }

    return;
  }

  // 如果找到了数据，直接执行操作
  switch (action) {
    case 'action-guide':
      // 显示添加到指南模态框
      if (typeof showAddToGuideModal === 'function') {
        showAddToGuideModal(pointData, animeData);
      } else {
        // 模拟点击
        pointItem.click();
        document.getElementById('add-to-guide-btn')?.click();
      }
      break;

    case 'action-compare':
      // 打开对比图链接
      if (pointData.compare) {
        window.open(pointData.compare, '_blank');
      } else {
        console.log('该巡礼点没有对比图');
      }
      break;

    case 'action-apple-maps':
      // 打开苹果地图
      if (pointData.geo && pointData.geo.length === 2) {
        const [lat, lng] = pointData.geo;
        const appleMapsUrl = `https://maps.apple.com/?q=${pointData.name || ''}&ll=${lat},${lng}&z=18`;
        window.open(appleMapsUrl, '_blank');
      } else {
        console.log('该巡礼点没有地理坐标');
      }
      break;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initSwipeActions);
