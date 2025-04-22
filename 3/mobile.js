// 移动端交互逻辑 - 优化版本

// 添加移动端全局错误处理
window.addEventListener('error', function(event) {
  // 静默处理错误，不影响用户体验
  // 仅在严重错误时记录到控制台
  if (event.error && event.error.message && event.error.message.includes('fatal')) {
    console.error('Mobile fatal error:', event.error.message);
  }
  return false; // 阻止错误向上传播
});

// 添加Promise错误处理
window.addEventListener('unhandledrejection', function(event) {
  // 静默处理Promise错误，不影响用户体验
  // 仅在严重错误时记录到控制台
  if (event.reason && typeof event.reason.message === 'string' && event.reason.message.includes('fatal')) {
    console.error('Mobile fatal promise rejection:', event.reason.message);
  }
  return false; // 阻止错误向上传播
});

// 初始化移动端功能
let mobileInitialized = false;
let mobileInitAttempts = 0;
let mobileInitTimeout = null;

// 抽屉状态管理变量
let mobileDrawerState = {
  type: 'anime-list', // 'anime-list', 'anime-points', 'search-results'
  searchTerm: '',     // 搜索词
  animeId: null,      // 当前显示的番剧ID
  scrollPosition: 0,  // 滚动位置
  fromSearch: false   // 是否从搜索结果进入的巡礼点列表
};

// 从localStorage加载抽屉状态 - 优化版本
function loadDrawerState() {
  try {
    const savedState = localStorage.getItem('mobileDrawerState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      // 使用对象合并而不是直接覆盖，保留默认值
      mobileDrawerState = {...mobileDrawerState, ...parsedState};
    }
  } catch (error) {
    // 静默处理错误，不影响用户体验
  }
}

// 保存抽屉状态到localStorage - 优化版本
function saveDrawerState() {
  try {
    // 使用节流存储，减少存储操作频率
    if (saveDrawerState.timer) {
      clearTimeout(saveDrawerState.timer);
    }

    saveDrawerState.timer = setTimeout(() => {
      localStorage.setItem('mobileDrawerState', JSON.stringify(mobileDrawerState));
      saveDrawerState.timer = null;
    }, 300);
  } catch (error) {
    // 静默处理错误，不影响用户体验
  }
}

// 覆盖主脚本中的showPointInfo函数，以便在移动端中正确处理番剧名称链接
const originalShowPointInfo = window.showPointInfo;
window.showPointInfo = function(point, anime, animeId) {
  // 调用原始函数
  if (typeof originalShowPointInfo === 'function') {
    originalShowPointInfo(point, anime, animeId);
  }

  // 在移动端中修改番剧名称链接，添加data-id属性
  setTimeout(() => {
    const animeLink = document.querySelector('#anime-name .anime-link');
    if (animeLink && !animeLink.hasAttribute('data-id')) {

      animeLink.setAttribute('data-id', animeId);
    }
  }, 100);
};

// 将初始化函数暴露给主脚本
window.initMobile = function() {
  // 防止重复初始化
  if (mobileInitialized) return;

  // 清除之前的超时定时器
  if (mobileInitTimeout) {
    clearTimeout(mobileInitTimeout);
    mobileInitTimeout = null;
  }

  // 记录尝试次数
  mobileInitAttempts++;

  // 检查全局番剧数据是否已加载
  // 注意：allAnimeData是主脚本中的全局变量，不是window对象的属性
  if (typeof allAnimeData === 'undefined' || Object.keys(allAnimeData).length === 0) {
    // 如果尝试次数超过20次，尝试自己加载数据
    if (mobileInitAttempts > 20) {
      console.warn('尝试加载全局番剧数据超过20次，尝试自己加载数据');

      // 尝试自己加载番剧数据
      if (typeof loadAnimeData === 'function') {
        loadAnimeData().then(() => {
          console.log('移动端自己加载番剧数据成功');
          mobileInitialized = true;
          initMobileDrawer();
          initMobileEvents();
        }).catch(error => {
          console.error('移动端自己加载番剧数据失败:', error);
          // 即使加载失败也初始化移动端
          mobileInitialized = true;
          initMobileDrawer();
          initMobileEvents();
        });
      } else {
        // 如果加载函数不可用，仍然初始化移动端
        console.error('loadAnimeData函数不可用，强制初始化移动端');
        mobileInitialized = true;
        initMobileDrawer();
        initMobileEvents();
      }
      return;
    }

    // 延迟再次尝试，每次延迟增加
    const delay = Math.min(500 * mobileInitAttempts, 3000); // 最大延迟3秒
    console.log(`全局番剧数据还未加载，延迟${delay}ms后再次尝试 (第${mobileInitAttempts}次)`);
    mobileInitTimeout = setTimeout(window.initMobile, delay);
    return;
  }

  // 数据已加载，进行初始化
  mobileInitialized = true;
  console.log('初始化移动端功能，全局番剧数据已加载：', Object.keys(allAnimeData).length, '部番剧');
  initMobileDrawer();
  initMobileEvents();
};

// 监听主脚本加载完成事件 - 优化版本
document.addEventListener('DOMContentLoaded', function() {
  try {
    // 加载抽屉状态
    loadDrawerState();

    // 尝试初始化移动端
    window.initMobile();

    // 监听主脚本触发的自定义事件
    document.addEventListener('animeDataLoaded', function(event) {
      if (!mobileInitialized) {
        window.initMobile();
      }
    });

    // 作为备用方案，使用MutationObserver监听文档变化
    const observer = new MutationObserver(function(mutations) {
      if (!mobileInitialized && typeof allAnimeData !== 'undefined' && Object.keys(allAnimeData).length > 0) {
        window.initMobile();
      }
    });

    // 开始监听文档变化
    observer.observe(document.body, { childList: true, subtree: true });

    // 10秒后停止监听，避免内存泄漏
    setTimeout(function() {
      try {
        observer.disconnect();

        // 如果还没有初始化，强制初始化
        if (!mobileInitialized) {
          mobileInitialized = true;
          initMobileDrawer();
          initMobileEvents();
        }
      } catch (error) {
        // 静默处理错误，不影响用户体验
      }
    }, 10000);
  } catch (error) {
    // 静默处理错误，不影响用户体验
    console.error('Error during mobile initialization:', error);
  }
});

// 初始化移动端抽屉
function initMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const handle = document.getElementById('drawer-handle');
  const drawerContent = drawer ? drawer.querySelector('.mobile-drawer-content') : null;

  if (!drawer || !handle) return;

  // 抽屉手柄点击事件 - 切换抽屉展开/收起状态
  handle.addEventListener('click', function() {
    // 如果抽屉已经展开，则收起
    if (drawer.classList.contains('expanded')) {
      drawer.classList.remove('expanded');
      drawer.style.height = '';
      drawer.style.transform = 'translateY(calc(100% - 60px))'; // 收起到只显示手柄和搜索栏

      // 抽屉关闭时，保存当前滚动位置
      if (drawerContent) {
        mobileDrawerState.scrollPosition = drawerContent.scrollTop;
        saveDrawerState();
      }
    }
    // 如果抽屉已经收起，则展开
    else {
      drawer.classList.add('expanded');
      drawer.style.height = '';
      drawer.style.transform = '';

      // 恢复抽屉状态
      restoreDrawerContent();
    }
  });

  // 实现抽屉拖拽功能
  let startY = 0;
  let startHeight = 0;
  let startTransform = 0;
  let isDragging = false;

  // 触摸开始事件
  handle.addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY;
    startHeight = drawer.offsetHeight;
    startTransform = getTransformY(drawer);
    isDragging = true;
  });

  // 鼠标按下事件（用于桌面端测试）
  handle.addEventListener('mousedown', function(e) {
    startY = e.clientY;
    startHeight = drawer.offsetHeight;
    startTransform = getTransformY(drawer);
    isDragging = true;

    // 阻止文本选择
    e.preventDefault();
  });

  // 触摸移动事件
  document.addEventListener('touchmove', function(e) {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    // 计算新的transform值
    let newTransform = startTransform + deltaY;

    // 限制抽屉不能完全拖出屏幕底部
    const maxTransform = window.innerHeight - 60; // 保留至少60px高度
    newTransform = Math.min(newTransform, maxTransform);

    // 限制抽屉不能拖到顶部以上
    newTransform = Math.max(newTransform, 0);

    // 应用新的transform
    drawer.style.transform = `translateY(${newTransform}px)`;

    // 阻止页面滚动
    e.preventDefault();
  }, { passive: false });

  // 鼠标移动事件（用于桌面端测试）
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;

    const currentY = e.clientY;
    const deltaY = currentY - startY;

    // 计算新的transform值
    let newTransform = startTransform + deltaY;

    // 限制抽屉不能完全拖出屏幕底部
    const maxTransform = window.innerHeight - 60; // 保留至少60px高度
    newTransform = Math.min(newTransform, maxTransform);

    // 限制抽屉不能拖到顶部以上
    newTransform = Math.max(newTransform, 0);

    // 应用新的transform
    drawer.style.transform = `translateY(${newTransform}px)`;
  });

  // 触摸结束事件
  document.addEventListener('touchend', function() {
    if (!isDragging) return;

    finalizeDrag(drawer);
    isDragging = false;
  });

  // 鼠标松开事件（用于桌面端测试）
  document.addEventListener('mouseup', function() {
    if (!isDragging) return;

    finalizeDrag(drawer);
    isDragging = false;
  });

  // 获取元素的translateY值
  function getTransformY(element) {
    const transform = window.getComputedStyle(element).getPropertyValue('transform');
    if (transform === 'none') return 0;

    const matrix = transform.match(/^matrix\((.+)\)$/);
    if (matrix) {
      const values = matrix[1].split(', ');
      return parseFloat(values[5]) || 0;
    }
    return 0;
  }

  // 根据拖拽位置确定最终状态
  function finalizeDrag(drawer) {
    const transformY = getTransformY(drawer);
    const windowHeight = window.innerHeight;

    // 如果拖到接近顶部，完全展开
    if (transformY < windowHeight * 0.2) {
      drawer.classList.add('expanded');
      drawer.style.transform = '';
      drawer.style.height = '';
    }
    // 如果拖到接近底部，收起
    else if (transformY > windowHeight * 0.6) {
      drawer.classList.remove('expanded');
      drawer.style.transform = '';
      drawer.style.height = '';
    }
    // 否则保持在当前位置
    else {
      drawer.classList.remove('expanded');
      // 保持当前transform
    }
  }

  // 触摸滑动事件
  // 注意：这里的变量用于处理滑动手势，与拖拽功能不同
  let drawerHeight = 0;
  let initialHeight = 0;

  // 处理手柄的拖拽事件
  let touchStartTimeForHandle = 0;
  let touchMoveCountForHandle = 0;

  handle.addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY;
    touchStartTimeForHandle = Date.now();
    touchMoveCountForHandle = 0;
    isDragging = true;

    // 获取当前抽屉高度
    const drawerRect = drawer.getBoundingClientRect();
    initialHeight = window.innerHeight - drawerRect.top;

    // 移除expanded类，以便自定义高度
    drawer.classList.remove('expanded');
    drawer.style.height = initialHeight + 'px';
    drawer.style.transform = 'none';

    e.stopPropagation();
  });

  handle.addEventListener('touchmove', function(e) {
    if (!isDragging) return;

    touchMoveCountForHandle++;
    currentY = e.touches[0].clientY;
    const diffY = currentY - startY;

    // 计算新的高度
    drawerHeight = initialHeight - diffY;

    // 限制最小和最大高度
    const minHeight = 60; // 最小高度，只显示搜索栏
    const maxHeight = window.innerHeight - 50 - 20; // 最大高度，减去底部导航栏和一些边距

    if (drawerHeight < minHeight) drawerHeight = minHeight;
    if (drawerHeight > maxHeight) drawerHeight = maxHeight;

    // 应用新高度
    drawer.style.height = drawerHeight + 'px';

    e.preventDefault();
    e.stopPropagation();
  });

  // 处理触摸结束事件
  handle.addEventListener('touchend', function(e) {
    // 判断是点击还是拖拽
    const touchDuration = Date.now() - touchStartTimeForHandle;

    // 如果是点击（触摸时间短且移动很少）
    if (touchDuration < 300 && touchMoveCountForHandle < 5) {
      // 如果抽屉已经展开，则收起
      if (initialHeight > 100) { // 如果初始高度足够大，说明抽屉已经展开
        drawer.classList.remove('expanded');
        drawer.style.height = '';
        drawer.style.transform = 'translateY(calc(100% - 60px))'; // 收起到只显示手柄和搜索栏
      }
      // 如果抽屉已经收起，则展开
      else {
        drawer.classList.add('expanded');
        drawer.style.height = '';
        drawer.style.transform = '';

        // 恢复抽屉状态
        restoreDrawerContent();
      }
    }
    // 如果是拖拽，则根据拖拽结果决定抽屉状态
    else {
      // 如果高度接近最大值，自动展开到最大
      const maxHeight = window.innerHeight - 50 - 20; // 更新底部导航栏高度从65px变为50px
      if (drawerHeight > maxHeight * 0.8) {
        drawer.classList.add('expanded');
        drawer.style.height = '';
        drawer.style.transform = '';
      }
      // 如果高度接近最小值，自动收起
      else if (drawerHeight < 100) {
        drawer.classList.remove('expanded');
        drawer.style.height = '';
        drawer.style.transform = 'translateY(calc(100% - 60px))';
      }
    }

    isDragging = false;

    // 加载可见的封面图片
    loadVisibleMobileCoverImages();

    // 如果抽屉关闭，保存滚动位置
    if (!drawer.classList.contains('expanded') && drawerContent) {
      mobileDrawerState.scrollPosition = drawerContent.scrollTop;
      saveDrawerState();
    }
  });

  // 抽屉整体的触摸事件（改进版，防止误关闭）
  let isScrolling = false;
  let touchStartTime = 0;
  let lastTouchY = 0;
  let touchMoveCount = 0;
  let scrollLockActive = false;

  // 不再需要单独的滚动锁定指示器，我们将使用抽屉手柄作为视觉指示

  // 检测是否在内容区域滚动
  if (drawerContent) {
    drawerContent.addEventListener('scroll', function() {
      // 当用户开始滚动内容时，激活滚动锁定
      if (!scrollLockActive && drawerContent.scrollTop > 10) {
        scrollLockActive = true;
        drawer.classList.add('scroll-lock');
      } else if (scrollLockActive && drawerContent.scrollTop <= 10) {
        // 当滚动回顶部时，解除滚动锁定
        scrollLockActive = false;
        drawer.classList.remove('scroll-lock');
      }
    });
  }

  drawer.addEventListener('touchstart', function(e) {
    if (e.target === handle || handle.contains(e.target)) return;

    startY = e.touches[0].clientY;
    lastTouchY = startY;
    touchStartTime = Date.now();
    touchMoveCount = 0;
    isScrolling = false;

    // 检查触摸开始位置是否在内容区域的顶部安全区域内
    const drawerRect = drawer.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    const safeZoneHeight = 100; // 顶部安全区域高度
    const touchOffsetY = touchY - drawerRect.top;

    // 如果在顶部安全区域内，解除滚动锁定
    if (touchOffsetY < safeZoneHeight && drawerContent && drawerContent.scrollTop <= 10) {
      scrollLockActive = false;
      drawer.classList.remove('scroll-lock');
    } else if (drawerContent && drawerContent.scrollTop > 10) {
      // 如果内容已经滚动，激活滚动锁定
      scrollLockActive = true;
      drawer.classList.add('scroll-lock');
    }
  });

  drawer.addEventListener('touchmove', function(e) {
    if (isDragging || e.target === handle || handle.contains(e.target)) return;

    currentY = e.touches[0].clientY;
    const diffY = currentY - startY;
    const instantVelocity = currentY - lastTouchY;
    lastTouchY = currentY;
    touchMoveCount++;

    // 检测是否是滚动手势
    if (!isScrolling && touchMoveCount > 3) {
      // 如果移动次数超过阈值，判断为滚动手势
      const isVerticalScroll = Math.abs(instantVelocity) > 1.5;
      if (isVerticalScroll && drawerContent) {
        isScrolling = true;
      }
    }

    // 如果滚动锁定已激活或正在内容区域滚动，不处理抽屉关闭手势
    if (scrollLockActive || isScrolling) return;

    // 向上滑动展开，向下滑动收起
    if (diffY < -50 && !drawer.classList.contains('expanded')) {
      drawer.classList.add('expanded');
      drawer.style.height = '';
      drawer.style.transform = '';
      startY = currentY;

      // 恢复抽屉状态
      restoreDrawerContent();
    } else if (diffY > 50 && drawer.classList.contains('expanded')) {
      // 只有在非滚动锁定状态下才允许关闭抽屉
      drawer.classList.remove('expanded');
      drawer.style.height = '';
      drawer.style.transform = '';
      startY = currentY;
    }
  });

  // 触摸结束时重置状态
  drawer.addEventListener('touchend', function() {
    isScrolling = false;
    // 如果触摸时间短且移动距离小，保持滚动锁定状态
    if (Date.now() - touchStartTime < 300 && touchMoveCount < 5) {
      // 短触摸不改变滚动锁定状态
    } else {
      // 根据内容滚动位置决定是否保持滚动锁定
      if (drawerContent && drawerContent.scrollTop <= 10) {
        scrollLockActive = false;
        drawer.classList.remove('scroll-lock');
      }
    }
  });

  // 抽屉内容滚动事件 - 用于加载更多番剧和懒加载封面图片
  if (drawerContent) {
    drawerContent.addEventListener('scroll', function() {
      // 加载可见的封面图片
      loadVisibleMobileCoverImages();

      // 保存滚动位置
      mobileDrawerState.scrollPosition = drawerContent.scrollTop;

      // 使用防抖函数保存状态，避免频繁写入localStorage
      if (window.saveDrawerStateDebounce) {
        clearTimeout(window.saveDrawerStateDebounce);
      }
      window.saveDrawerStateDebounce = setTimeout(() => {
        saveDrawerState();
      }, 300);

      // 检查是否滚动到底部，如果是则加载更多番剧
      const scrollTop = drawerContent.scrollTop;
      const scrollHeight = drawerContent.scrollHeight;
      const clientHeight = drawerContent.clientHeight;

      // 当滚动到距离底部100px时，加载更多，提前预加载内容
      if (scrollHeight - scrollTop - clientHeight < 100 && !mobileIsLoading && mobileHasMoreAnimes) {
        console.log('滚动到底部，尝试加载更多内容');

        // 检查是否应该加载更多
        if (mobileAnimeExpandActivated) {
          console.log('移动端番剧展开模式：加载更多番剧');
          loadMobileAnimeList(false); // 不重置列表，继续加载更多
        } else {
          console.log('未激活展开加载功能，不加载更多内容');
        }
      }
    });
  }

  // 默认在移动端显示抽屉，在桌面版中绝对不显示
  if (window.innerWidth <= 768) {
    drawer.style.display = 'flex';

    // 默认加载番剧列表，并设置为自动展开加载所有番剧
    mobileAnimeExpandActivated = true;

    // 限制页面整体滚动，防止与抽屉拖拽冲突
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    // 添加事件监听器防止页面整体滚动
    document.addEventListener('touchmove', function(e) {
      // 如果触摸目标不在抽屉内部或其他可滚动元素内，阻止默认行为
      if (!isScrollableElement(e.target)) {
        e.preventDefault();
      }
    }, { passive: false });

    // 尝试恢复之前的抽屉状态，如果没有则加载番剧列表
    loadDrawerState();
    if (mobileDrawerState.type !== 'anime-list' &&
        (mobileDrawerState.type === 'anime-points' && mobileDrawerState.animeId ||
         mobileDrawerState.type === 'search-results' && mobileDrawerState.searchTerm)) {
      console.log('初始化时恢复抽屉状态:', mobileDrawerState.type);
      restoreDrawerContent();
    } else {
      loadMobileAnimeList();
    }
  } else {
    drawer.style.display = 'none';
    // 桌面版恢复正常滚动行为
    document.body.style.overscrollBehavior = 'auto';
    document.documentElement.style.overscrollBehavior = 'auto';
  }

  // 检查元素是否可滚动
  function isScrollableElement(element) {
    // 检查元素是否在抽屉内部
    let current = element;
    while (current && current !== document.body) {
      if (current === drawerContent ||
          current.classList && (current.classList.contains('mobile-drawer-content') ||
                               current.classList.contains('info-card'))) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  // 窗口大小变化时调整
  window.addEventListener('resize', function() {
    if (window.innerWidth <= 768) {
      // 移动端模式
      if (document.querySelector('.mobile-nav-item.active').getAttribute('data-target') === 'anime-panel') {
        drawer.style.display = 'flex';

        // 限制页面整体滚动，防止与抽屉拖拽冲突
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';

        // 尝试恢复抽屉状态，而不是直接加载番剧列表
        loadDrawerState();
        if (mobileDrawerState.type !== 'anime-list' &&
            (mobileDrawerState.type === 'anime-points' && mobileDrawerState.animeId ||
             mobileDrawerState.type === 'search-results' && mobileDrawerState.searchTerm)) {
          console.log('窗口大小变化时恢复抽屉状态:', mobileDrawerState.type);
          restoreDrawerContent();
        } else {
          loadMobileAnimeList();
        }

        // 确保抽屉展开
        drawer.classList.add('expanded');
      }
    } else {
      // 桌面版模式 - 绝对不显示抽屉
      drawer.style.display = 'none';

      // 桌面版恢复正常滚动行为
      document.body.style.overscrollBehavior = 'auto';
      document.documentElement.style.overscrollBehavior = 'auto';
    }

    // 重置抽屉高度
    drawer.style.height = '';
    drawer.style.transform = '';

    // 加载可见的封面图片
    loadVisibleMobileCoverImages();
  });
}

// 初始化移动端事件
function initMobileEvents() {
  // 监听信息卡片中的番剧名称链接点击事件
  document.addEventListener('click', function(e) {
    // 输出点击元素的调试信息
    console.log('点击元素:', e.target.tagName, e.target.className);

    // 检查点击的是否是番剧名称链接
    if (e.target && e.target.classList.contains('anime-link')) {
      e.preventDefault(); // 阻止默认行为
      console.log('点击了番剧名称链接');
      console.log('链接HTML:', e.target.outerHTML);

      // 如果是桌面版，不处理抽屉相关操作
      if (window.innerWidth > 768) {
        console.log('桌面版不处理抽屉相关操作');
        return;
      }

      // 尝试从 data-id 属性获取番剧ID
      let animeId = e.target.getAttribute('data-id');
      console.log('data-id属性值:', animeId);

      // 如果没有data-id属性，尝试从 URL 参数中获取
      if (!animeId) {
        console.log('没有找到data-id属性，尝试从 URL 获取');
        const urlParams = new URLSearchParams(window.location.search);
        animeId = urlParams.get('fan');
        console.log('从 URL 获取的番剧ID:', animeId);
      }

      // 如果有番剧ID，处理点击事件
      if (animeId && typeof allAnimeData === 'object' && allAnimeData[animeId]) {
        console.log('找到番剧数据，处理点击事件');
        handleAnimeNameLinkClick(animeId, allAnimeData[animeId]);
      } else {
        console.error('无法获取番剧ID或番剧数据不存在');
        console.log('URL:', window.location.href);
        console.log('allAnimeData是否可用:', typeof allAnimeData, Object.keys(allAnimeData || {}).length);
      }
    }
  });

  // 移动端底部导航切换
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      console.log('点击移动端导航项:', target);

      // 更新导航项激活状态
      document.querySelectorAll('.mobile-nav-item').forEach(navItem => {
        navItem.classList.remove('active');
      });
      this.classList.add('active');

      // 移除所有内容面板的active类
      document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
      });

      // 为对应的内容面板添加active类
      const targetPanel = document.getElementById(target);
      if (targetPanel) {
        targetPanel.classList.add('active');
        console.log('激活内容面板:', target);
      } else {
        console.error('找不到目标面板:', target);
      }

      // 同步侧边栏导航状态
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(navItem => {
        if (navItem.getAttribute('data-target') === target) {
          navItem.classList.add('active');
        } else {
          navItem.classList.remove('active');
        }
      });

      // 同步地图模式状态
      if (target === 'anime-panel') {
        // 如果是番剧面板，切换到全部模式
        if (typeof setMode === 'function') {
          setMode('all');
        }
      } else if (target === 'guide-panel') {
        // 如果是指南面板，切换到指南模式
        if (typeof setMode === 'function') {
          // 获取全局变量中的当前指南ID和指南列表
          const currentGuideId = window.currentGuide;
          const guides = window.guides || [];

          console.log('切换到指南面板，当前指南ID:', currentGuideId, '指南列表:', guides.length);

          if (currentGuideId) {
            setMode('guide');
          } else if (guides.length > 0) {
            // 如果有指南但未选中，打开第一个指南
            if (typeof window.openGuideDetails === 'function') {
              try {
                console.log('尝试打开第一个指南:', guides[0].id);
                window.openGuideDetails(guides[0].id);
              } catch (error) {
                console.error('打开指南失败:', error);
              }
            } else {
              console.error('openGuideDetails函数不可用');
            }
          } else {
            console.log('没有可用的指南');
            if (typeof showToast === 'function') {
              showToast('请先创建一个指南', 'warning');
            }
          }
        }
      }

      // 如果是番剧面板，显示抽屉
      const drawer = document.getElementById('mobile-drawer');
      if (target === 'anime-panel') {
        drawer.style.display = 'flex';
        // 恢复抽屉状态，而不是直接加载番剧列表
        restoreDrawerContent();

        // 确保抽屉展开
        drawer.classList.add('expanded');
        drawer.style.height = '';
        drawer.style.transform = '';

        // 隐藏侧边栏
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
          sidebar.style.display = 'none';

          // 恢复标题和搜索栏的显示
          const sidebarTitle = sidebar.querySelector('.sidebar-content h3');
          const searchContainer = sidebar.querySelector('.sidebar-content .search-container');

          if (sidebarTitle) sidebarTitle.style.display = '';
          if (searchContainer) searchContainer.style.display = '';
        }
      } else if (target === 'guide-panel') {
        console.log('处理guide-panel目标面板的显示');

        // 切换到指南面板前，保存抽屉状态
        const drawerContent = drawer.querySelector('.mobile-drawer-content');
        if (drawerContent) {
          mobileDrawerState.scrollPosition = drawerContent.scrollTop;
          saveDrawerState();
        }

        // 如果是指南面板，显示指南列表
        drawer.style.display = 'none';

        // 显示侧边栏并激活指南面板
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
          console.log('找到侧边栏元素，设置为显示');
          sidebar.style.display = 'block';

          // 隐藏标题和搜索栏
          const sidebarTitle = sidebar.querySelector('.sidebar-content h3');
          const searchContainer = sidebar.querySelector('.sidebar-content .search-container');

          if (sidebarTitle) {
            console.log('隐藏侧边栏标题');
            sidebarTitle.style.display = 'none';
          }
          if (searchContainer) {
            console.log('隐藏侧边栏搜索容器');
            searchContainer.style.display = 'none';
          }

          // 添加移动端关闭按钮
          let closeButton = document.getElementById('mobile-sidebar-close');
          if (!closeButton) {
            closeButton = document.createElement('button');
            closeButton.id = 'mobile-sidebar-close';
            closeButton.className = 'btn btn-sm btn-light mobile-sidebar-close';
            closeButton.innerHTML = '<i class="bi bi-x-lg"></i>';
            closeButton.addEventListener('click', function() {
              sidebar.style.display = 'none';

              // 恢复标题和搜索栏的显示
              if (sidebarTitle) sidebarTitle.style.display = '';
              if (searchContainer) searchContainer.style.display = '';
            });
            sidebar.appendChild(closeButton);
          }

          // 激活指南面板
          document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.remove('active');
            console.log('移除面板激活状态:', panel.id);
          });

          const guidePanel = document.getElementById('guide-panel');
          if (guidePanel) {
            console.log('找到指南面板，激活它:', guidePanel.id);
            guidePanel.classList.add('active');
          } else {
            console.error('找不到指南面板元素');
          }

          // 同步侧边栏导航状态
          document.querySelectorAll('.sidebar-nav .nav-item').forEach(navItem => {
            navItem.classList.remove('active');
          });

          const guideNav = document.getElementById('guide-nav');
          if (guideNav) {
            guideNav.classList.add('active');
          }
        }
      } else if (target === 'settings-panel') {
        // 切换到设置面板前，保存抽屉状态
        const drawerContent = drawer.querySelector('.mobile-drawer-content');
        if (drawerContent) {
          mobileDrawerState.scrollPosition = drawerContent.scrollTop;
          saveDrawerState();
        }

        // 如果是设置面板，显示设置面板
        drawer.style.display = 'none';

        // 显示侧边栏并激活设置面板
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
          sidebar.style.display = 'block';

          // 隐藏标题和搜索栏
          const sidebarTitle = sidebar.querySelector('.sidebar-content h3');
          const searchContainer = sidebar.querySelector('.sidebar-content .search-container');

          if (sidebarTitle) sidebarTitle.style.display = 'none';
          if (searchContainer) searchContainer.style.display = 'none';

          // 添加移动端关闭按钮
          let closeButton = document.getElementById('mobile-sidebar-close');
          if (!closeButton) {
            closeButton = document.createElement('button');
            closeButton.id = 'mobile-sidebar-close';
            closeButton.className = 'btn btn-sm btn-light mobile-sidebar-close';
            closeButton.innerHTML = '<i class="bi bi-x-lg"></i>';
            closeButton.addEventListener('click', function() {
              sidebar.style.display = 'none';

              // 恢复标题和搜索栏的显示
              if (sidebarTitle) sidebarTitle.style.display = '';
              if (searchContainer) searchContainer.style.display = '';
            });
            sidebar.appendChild(closeButton);
          }

          // 激活设置面板
          document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.remove('active');
          });

          const settingsPanel = document.getElementById('settings-panel');
          if (settingsPanel) {
            settingsPanel.classList.add('active');
          }

          // 同步侧边栏导航状态
          document.querySelectorAll('.sidebar-nav .nav-item').forEach(navItem => {
            navItem.classList.remove('active');
          });

          const settingsNav = document.getElementById('settings-nav');
          if (settingsNav) {
            settingsNav.classList.add('active');
          }
        }
      } else {
        drawer.style.display = 'none';
      }
    });
  });

  // 移动端模式切换按钮事件
  const mobileModeAllBtn = document.getElementById('mobile-mode-all');
  const mobileModeSingleBtn = document.getElementById('mobile-mode-single');
  const mobileModeGuideBtn = document.getElementById('mobile-mode-guide');

  if (mobileModeAllBtn && mobileModeSingleBtn && mobileModeGuideBtn) {
    // 全部模式按钮
    mobileModeAllBtn.addEventListener('click', function(e) {
      e.preventDefault(); // 防止默认行为
      e.stopPropagation(); // 防止事件冒泡

      console.log('点击移动端全部模式按钮');
      if (typeof setMode === 'function') {
        try {
          setMode('all');
          // 更新按钮状态
          updateMobileModeBtns('all');
          // 刷新地图
          if (map) {
            setTimeout(() => {
              map.invalidateSize();
              if (typeof updateVisibleMarkers === 'function') {
                updateVisibleMarkers();
              }
            }, 100);
          }
        } catch (error) {
          console.error('设置全部模式失败:', error);
        }
      }
    });

    // 单番剧模式按钮
    mobileModeSingleBtn.addEventListener('click', function(e) {
      e.preventDefault(); // 防止默认行为
      e.stopPropagation(); // 防止事件冒泡

      console.log('点击移动端单番剧模式按钮');
      if (typeof setMode === 'function') {
        if (currentAnime) {
          try {
            setMode('single');
            // 更新按钮状态
            updateMobileModeBtns('single');
            // 刷新地图
            if (map) {
              setTimeout(() => {
                map.invalidateSize();
                if (typeof updateVisibleMarkers === 'function') {
                  updateVisibleMarkers();
                }
              }, 100);
            }
          } catch (error) {
            console.error('设置单番剧模式失败:', error);
          }
        } else {
          showToast('请先选择一个番剧', 'warning');
        }
      }
    });

    // 指南模式按钮
    mobileModeGuideBtn.addEventListener('click', function(e) {
      e.preventDefault(); // 防止默认行为
      e.stopPropagation(); // 防止事件冒泡

      console.log('点击移动端指南模式按钮');
      if (typeof setMode === 'function') {
        if (currentGuideId) {
          try {
            setMode('guide');
            // 更新按钮状态
            updateMobileModeBtns('guide');
            // 刷新地图
            if (map) {
              setTimeout(() => {
                map.invalidateSize();
                if (typeof updateVisibleMarkers === 'function') {
                  updateVisibleMarkers();
                }
              }, 100);
            }
          } catch (error) {
            console.error('设置指南模式失败:', error);
          }
        } else if (window.guides && window.guides.length > 0) {
          // 如果有指南但未选中，打开第一个指南
          if (typeof window.openGuideDetails === 'function') {
            try {
              console.log('尝试打开第一个指南:', window.guides[0].id);
              window.openGuideDetails(window.guides[0].id);
              // 更新按钮状态
              setTimeout(() => {
                updateMobileModeBtns('guide');
              }, 300);
            } catch (error) {
              console.error('打开指南失败:', error);
            }
          } else {
            console.error('openGuideDetails函数不可用');
          }
        } else {
          showToast('请先创建一个指南', 'warning');
        }
      }
    });
  }

  // 更新移动端模式按钮状态
  function updateMobileModeBtns(mode) {
    const mobileModeAllBtn = document.getElementById('mobile-mode-all');
    const mobileModeSingleBtn = document.getElementById('mobile-mode-single');
    const mobileModeGuideBtn = document.getElementById('mobile-mode-guide');

    if (mobileModeAllBtn && mobileModeSingleBtn && mobileModeGuideBtn) {
      // 重置所有按钮状态
      mobileModeAllBtn.classList.remove('active', 'btn-primary');
      mobileModeAllBtn.classList.add('btn-outline-primary');

      mobileModeSingleBtn.classList.remove('active', 'btn-primary');
      mobileModeSingleBtn.classList.add('btn-outline-primary');

      mobileModeGuideBtn.classList.remove('active', 'btn-primary');
      mobileModeGuideBtn.classList.add('btn-outline-primary');

      // 设置当前模式按钮状态
      switch (mode) {
        case 'all':
          mobileModeAllBtn.classList.add('active', 'btn-primary');
          mobileModeAllBtn.classList.remove('btn-outline-primary');
          break;
        case 'single':
          mobileModeSingleBtn.classList.add('active', 'btn-primary');
          mobileModeSingleBtn.classList.remove('btn-outline-primary');
          break;
        case 'guide':
          mobileModeGuideBtn.classList.add('active', 'btn-primary');
          mobileModeGuideBtn.classList.remove('btn-outline-primary');
          break;
      }
    }
  }

  // 初始化移动端模式切换按钮状态
  if (typeof currentMode === 'string') {
    updateMobileModeBtns(currentMode);
  } else {
    // 默认为全部模式
    updateMobileModeBtns('all');
  }

  // 移动端搜索功能
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileSearchButton = document.getElementById('mobile-search-button');

  if (mobileSearchInput && mobileSearchButton) {
    // 直接使用主脚本的搜索功能
    mobileSearchInput.addEventListener('input', function() {
      // 同步到主搜索框，但不立即触发搜索
      const searchTerm = this.value.trim();
      document.getElementById('search-input').value = searchTerm;
    });

    // 确保移动端搜索按钮点击事件正常工作
    mobileSearchButton.addEventListener('click', async function() {
      const searchTerm = mobileSearchInput.value.trim();
      if (searchTerm) {
        try {
          // 显示加载指示器
          const mobileAnimeList = document.getElementById('mobile-anime-list');
          mobileAnimeList.innerHTML = '<div class="loading-indicator">正在搜索...</div>';

          // 设置主搜索框的值
          document.getElementById('search-input').value = searchTerm;

          // 直接使用主脚本的搜索功能但将结果显示在移动端
          if (typeof window.searchAnimeAndPoints === 'function' && typeof window.searchLocation === 'function') {
            // 1. 搜索番剧和巡礼点
            const animeResults = await window.searchAnimeAndPoints(searchTerm);

            // 2. 搜索地理位置
            const locationResults = await window.searchLocation(searchTerm);

            // 3. 合并搜索结果
            const combinedResults = {
              animes: animeResults.animes || [],
              points: animeResults.points || [],
              locations: locationResults || []
            };

            // 4. 渲染搜索结果到移动端列表
            renderMobileSearchResults(combinedResults);
          } else {
            // 如果主脚本的搜索函数不可用，尝试使用简单的本地搜索
            const results = searchMobileAnimeList(searchTerm);
            if (results.length === 0) {
              mobileAnimeList.innerHTML = '<div class="no-results">没有找到匹配的结果</div>';
            }
          }

          // 确保抽屉已展开，以便用户看到搜索结果
          const drawer = document.getElementById('mobile-drawer');
          drawer.classList.add('expanded');
          drawer.style.height = '';
          drawer.style.transform = '';
        } catch (error) {
          console.error('搜索出错:', error);
          document.getElementById('mobile-anime-list').innerHTML = '<div class="no-results">搜索出错，请重试</div>';
        }
      }
    });

    // 添加回车键搜索功能
    mobileSearchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        mobileSearchButton.click();
      }
    });
  }
}

// 移动端番剧列表分页相关变量
let mobilePage = 1; // 当前页码
const MOBILE_PAGE_SIZE = 20; // 每页显示的番剧数量
let mobileIsLoading = false; // 是否正在加载更多番剧
let mobileHasMoreAnimes = true; // 是否还有更多番剧可加载
let mobileAnimeExpandActivated = true; // 番剧列表是否已激活展开加载功能 - 默认激活

// 恢复抽屉内容
function restoreDrawerContent() {
  // 加载保存的抽屉状态
  loadDrawerState();

  console.log('恢复抽屉状态:', mobileDrawerState);

  // 确保抽屉内容元素存在
  const drawer = document.getElementById('mobile-drawer');
  const drawerContent = drawer ? drawer.querySelector('.mobile-drawer-content') : null;
  if (!drawerContent) {
    console.error('抽屉内容元素不存在');
    return;
  }

  // 根据状态类型恢复内容
  switch (mobileDrawerState.type) {
    case 'anime-points':
      // 如果有番剧ID，显示该番剧的巡礼点
      if (mobileDrawerState.animeId && typeof allAnimeData === 'object' && allAnimeData[mobileDrawerState.animeId]) {
        console.log('恢复番剧巡礼点列表:', mobileDrawerState.animeId);
        showMobileAnimePoints(allAnimeData[mobileDrawerState.animeId], mobileDrawerState.animeId);
      } else {
        // 如果没有有效的番剧ID，回退到番剧列表
        console.log('无法恢复番剧巡礼点，回退到番剧列表');
        loadMobileAnimeList();
      }
      break;

    case 'search-results':
      // 如果有搜索词，恢复搜索结果
      if (mobileDrawerState.searchTerm) {
        console.log('恢复搜索结果:', mobileDrawerState.searchTerm);
        // 设置搜索框的值
        const mobileSearchInput = document.getElementById('mobile-search-input');
        if (mobileSearchInput) {
          mobileSearchInput.value = mobileDrawerState.searchTerm;
        }

        // 执行搜索
        if (typeof window.searchAnimeAndPoints === 'function' && typeof window.searchLocation === 'function') {
          // 显示加载指示器
          const mobileAnimeList = document.getElementById('mobile-anime-list');
          mobileAnimeList.innerHTML = '<div class="loading-indicator">正在搜索...</div>';

          // 执行搜索
          Promise.all([
            window.searchAnimeAndPoints(mobileDrawerState.searchTerm),
            window.searchLocation(mobileDrawerState.searchTerm)
          ]).then(([animeResults, locationResults]) => {
            // 合并搜索结果
            const combinedResults = {
              animes: animeResults.animes || [],
              points: animeResults.points || [],
              locations: locationResults || []
            };

            // 渲染搜索结果
            renderMobileSearchResults(combinedResults);

            // 恢复滚动位置
            setTimeout(() => {
              const drawer = document.getElementById('mobile-drawer');
              const drawerContent = drawer ? drawer.querySelector('.mobile-drawer-content') : null;
              if (drawerContent && mobileDrawerState.scrollPosition) {
                drawerContent.scrollTop = mobileDrawerState.scrollPosition;
              }
            }, 100);
          }).catch(error => {
            console.error('恢复搜索结果失败:', error);
            loadMobileAnimeList(); // 失败时回退到番剧列表
          });
        } else {
          // 如果搜索函数不可用，回退到番剧列表
          console.log('搜索函数不可用，回退到番剧列表');
          loadMobileAnimeList();
        }
      } else {
        // 如果没有搜索词，回退到番剧列表
        console.log('没有搜索词，回退到番剧列表');
        loadMobileAnimeList();
      }
      break;

    case 'anime-list':
    default:
      // 默认加载番剧列表
      console.log('加载番剧列表');
      loadMobileAnimeList();
      break;
  }
}

// 加载移动端番剧列表
function loadMobileAnimeList(resetList = true) {
  const mobileAnimeList = document.getElementById('mobile-anime-list');

  // 更新抽屉状态
  mobileDrawerState.type = 'anime-list';
  mobileDrawerState.animeId = null;
  saveDrawerState();

  // 如果是重置列表，则清空现有内容并重置分页
  if (resetList) {
    mobileAnimeList.innerHTML = '<div class="loading-indicator">正在加载番剧列表...</div>';
    mobilePage = 1;
    mobileHasMoreAnimes = true;
    mobileAnimeExpandActivated = false;
  }

  // 如果正在加载或没有更多数据，则直接返回
  if (mobileIsLoading || !mobileHasMoreAnimes) return;

  // 标记为正在加载
  mobileIsLoading = true;

  try {
    // 直接使用全局番剧数据
    if (typeof allAnimeData !== 'undefined' && Object.keys(allAnimeData).length > 0) {
      // 如果是重置列表，则清空现有内容
      if (resetList) {
        mobileAnimeList.innerHTML = '';
      } else {
        // 移除加载指示器（如果有）
        const loadingIndicator = mobileAnimeList.querySelector('.loading-indicator');
        if (loadingIndicator) {
          loadingIndicator.remove();
        }

        // 移除展开按钮（如果有）
        const expandButton = mobileAnimeList.querySelector('.expand-anime-btn');
        if (expandButton) {
          expandButton.remove();
        }
      }

      // 将对象转换为数组并添加ID
      // 使用与桌面端相同的处理方式
      const allAnimeList = [];

      // 保持与桌面端相同的顺序
      Object.entries(allAnimeData).forEach(([id, anime]) => {
        // 确保每个番剧对象都有id属性
        // 检查番剧对象是否有名称
        if (!anime.name && !anime.name_cn) {
          console.warn('番剧没有名称:', id);
          // 不修改原始数据，保持与桌面端一致
        }
        allAnimeList.push({
          type: 'anime',
          id,
          anime,
          matchType: 'title'
        });
      });

      console.log('处理后的番剧列表数量:', allAnimeList.length);
      // 检查第一个番剧对象
      if (allAnimeList.length > 0) {
        console.log('第一个番剧对象:', allAnimeList[0]);
      }

      // 检查没有名称的番剧
      const noNameAnimes = allAnimeList.filter(anime => !anime.name && !anime.name_cn);
      if (noNameAnimes.length > 0) {
        console.warn('有', noNameAnimes.length, '部番剧没有名称');
        console.warn('第一部没有名称的番剧:', noNameAnimes[0]);
      }

      if (allAnimeList.length === 0) {
        mobileAnimeList.innerHTML = '<div class="no-results">没有找到番剧</div>';
        mobileIsLoading = false;
        return;
      }

      // 不进行排序，保持与原始数据相同的顺序
      // 这样可以确保移动端和桌面端显示相同的顺序

      // 计算当前页的起始和结束索引
      const startIndex = (mobilePage - 1) * MOBILE_PAGE_SIZE;
      const endIndex = Math.min(startIndex + MOBILE_PAGE_SIZE, allAnimeList.length);

      // 获取当前页的番剧数据
      const currentPageAnimes = allAnimeList.slice(startIndex, endIndex);

      // 渲染当前页的番剧，使用与桌面端相同的渲染方式
      currentPageAnimes.forEach(result => {
        const animeItem = document.createElement('div');
        animeItem.className = 'anime-item';
        animeItem.dataset.id = result.id;

        // 如果是当前选中的番剧，添加active类
        if (currentAnime === result.id) {
          animeItem.classList.add('active');
        }

        const anime = result.anime;
        let pointsCount = 0;
        if (anime.points && Array.isArray(anime.points)) {
          pointsCount = anime.points.length;
        } else if (anime.inform) {
          pointsCount = '待加载';
        }

        // 使用与桌面端相同的HTML结构
        animeItem.innerHTML = `
          <img class="anime-cover" src="loading.svg" data-src="${updateImageUrl(anime.cover) || 'loading.svg'}" alt="${anime.name || anime.name_cn}">
          <div class="anime-info">
            <p class="anime-name">${anime.name_cn || anime.name}</p>
            <p class="anime-points">${pointsCount} ${typeof pointsCount === 'number' ? '个地点' : ''}</p>
          </div>
        `;

        animeItem.addEventListener('click', () => {
          // 显示加载中提示
          const mobileAnimeList = document.getElementById('mobile-anime-list');
          mobileAnimeList.innerHTML = '<div class="loading-indicator">正在加载地点数据...</div>';

          // 先选择番剧，这会在地图上显示该番剧的所有地点
          selectAnime(result.id);

          // 确保已加载该番剧的地点数据
          const anime = allAnimeData[result.id];
          if (!anime.points || !Array.isArray(anime.points)) {
            // 加载地点数据并显示地点列表
            if (typeof loadAnimePoints === 'function') {
              console.log('开始加载番剧地点数据:', result.id);
              loadAnimePoints(result.id).then((pointsData) => {
                console.log('番剧地点数据加载成功:', result.id, pointsData ? pointsData.length : 0);
                // 加载完成后显示地点列表
                showMobileAnimePoints(allAnimeData[result.id], result.id);
              }).catch(error => {
                console.error('加载地点数据失败:', error);
                // 即使加载失败，也尝试显示地点列表
                showMobileAnimePoints(allAnimeData[result.id], result.id);
              });
            } else {
              // 如果加载函数不可用，仍然尝试显示地点列表
              console.warn('loadAnimePoints函数不可用，使用现有数据');
              showMobileAnimePoints(anime, result.id);
            }
          } else {
            // 如果已经有地点数据，直接显示地点列表
            showMobileAnimePoints(anime, result.id);
          }
        });

        mobileAnimeList.appendChild(animeItem);
      });

      // 检查是否还有更多数据
      mobileHasMoreAnimes = endIndex < allAnimeList.length;

      // 如果还有更多番剧数据，添加展开按钮（如果未激活自动展开功能）
      if (mobileHasMoreAnimes && !mobileAnimeExpandActivated) {
        const expandButton = document.createElement('button');
        expandButton.className = 'btn btn-outline-primary btn-sm expand-anime-btn';
        expandButton.textContent = '展开更多番剧';
        expandButton.id = 'mobile-expand-anime-btn';
        mobileAnimeList.appendChild(expandButton);

        // 点击展开按钮加载更多番剧
        expandButton.addEventListener('click', function() {
          // 移除展开按钮
          this.remove();

          // 激活滚动加载更多功能
          mobileAnimeExpandActivated = true;
          console.log('已激活移动端番剧展开加载功能');

          // 立即加载下一批番剧
          mobilePage++; // 确保加载下一页
          loadMobileAnimeList(false); // 不重置列表，加载更多番剧
        });
      } else if (mobileHasMoreAnimes && mobileAnimeExpandActivated) {
        // 如果已激活自动展开功能，自动加载下一批
        console.log('自动加载下一批番剧');
        setTimeout(() => {
          if (mobileHasMoreAnimes) {
            mobilePage++;
            loadMobileAnimeList(false); // 不重置列表，加载更多番剧
          }
        }, 500);
      }

      // 如果有搜索词，立即过滤列表
      const searchTerm = document.getElementById('mobile-search-input').value.toLowerCase().trim();
      if (searchTerm) {
        filterMobileAnimeList(searchTerm);
      }

      // 恢复滚动位置
      setTimeout(() => {
        const drawer = document.getElementById('mobile-drawer');
        const drawerContent = drawer ? drawer.querySelector('.mobile-drawer-content') : null;
        if (drawerContent && mobileDrawerState.scrollPosition) {
          drawerContent.scrollTop = mobileDrawerState.scrollPosition;
        }
      }, 100);

      // 确保抽屉已展开，以便用户看到番剧列表
      const drawer = document.getElementById('mobile-drawer');
      drawer.classList.add('expanded');
      drawer.style.height = '';
      drawer.style.transform = '';

      // 加载可见的封面图片
      loadVisibleMobileCoverImages();

      // 标记为加载完成
      mobileIsLoading = false;

      // 更新页码
      mobilePage++;
    } else {
      // 如果全局数据不可用，尝试等待数据加载
      console.log('全局番剧数据不可用，等待数据加载...');

      // 显示等待消息
      if (resetList) {
        mobileAnimeList.innerHTML = '<div class="loading-indicator">正在加载番剧数据...</div>';
      }

      // 设置一个定时器，定期检查数据是否可用
      const checkDataInterval = setInterval(() => {
        if (typeof allAnimeData !== 'undefined' && Object.keys(allAnimeData).length > 0) {
          clearInterval(checkDataInterval);
          console.log('检测到全局番剧数据已加载，尝试加载列表');
          mobileIsLoading = false;
          loadMobileAnimeList(resetList);
        }
      }, 500);

      // 设置超时，防止无限等待
      setTimeout(() => {
        clearInterval(checkDataInterval);

        // 如果还是没有数据，尝试主动加载
        if (typeof allAnimeData === 'undefined' || Object.keys(allAnimeData).length === 0) {
          console.log('等待全局番剧数据超时，尝试主动加载');

          if (typeof window.loadAnimeData === 'function') {
            window.loadAnimeData().then(() => {
              // 数据加载后再次调用加载列表
              mobileIsLoading = false;
              loadMobileAnimeList(resetList);
            }).catch(error => {
              console.error('加载番剧数据失败:', error);
              mobileAnimeList.innerHTML = '<div class="no-results">加载失败，请重试</div>';
              mobileIsLoading = false;
            });
          } else {
            mobileAnimeList.innerHTML = '<div class="no-results">无法加载番剧数据，请刷新页面</div>';
            mobileIsLoading = false;
          }
        }
      }, 5000); // 5秒超时

      // 标记为加载中，防止重复调用
      return;
    }
  } catch (error) {
    console.error('加载移动端番剧列表失败:', error);
    mobileAnimeList.innerHTML = '<div class="no-results">加载失败，请重试</div>';
    mobileIsLoading = false;
  }
}

// 加载可见的移动端番剧封面图片 - 优化版本
function loadVisibleMobileCoverImages() {
  try {
    // 获取所有带有data-src属性的封面图片
    const coverImages = document.querySelectorAll('#mobile-anime-list .anime-cover[data-src], #mobile-anime-list .point-cover[data-src]');

    // 如果没有需要加载的图片，直接返回
    if (coverImages.length === 0) return;

    // 获取可视区域尺寸
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    // 扩展可视区域范围，提前加载即将进入视野的图片
    const buffer = 100; // 像素缓冲区

    // 使用IntersectionObserver来检测可见性，如果支持
    if ('IntersectionObserver' in window) {
      // 创建一个新的观察器
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            if (src) {
              // 设置图片源
              img.src = src;
              img.removeAttribute('data-src');
              img.style.opacity = '1';
              // 停止观察该图片
              observer.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: `${buffer}px`
      });

      // 开始观察所有图片
      coverImages.forEach(img => observer.observe(img));
    } else {
      // 回退到传统方法
      coverImages.forEach(img => {
        const rect = img.getBoundingClientRect();
        const isVisible = (
          rect.top >= -buffer &&
          rect.left >= -buffer &&
          rect.bottom <= viewportHeight + buffer &&
          rect.right <= viewportWidth + buffer
        );

        if (isVisible) {
          const src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.style.opacity = '1';
          }
        }
      });
    }
  } catch (error) {
    // 静默处理错误，不影响用户体验
  }
}

// 创建移动端番剧列表项
function createMobileAnimeListItem(anime) {
  const animeItem = document.createElement('div');
  animeItem.className = 'anime-item';

  // 确保 anime 对象有 id 属性
  const animeId = anime.id || (typeof anime === 'object' ? Object.keys(anime)[0] : '');
  animeItem.setAttribute('data-anime-id', animeId);

  // 确保点数显示正确
  let pointsCount = 0;
  if (anime.points && Array.isArray(anime.points)) {
    pointsCount = anime.points.length;
  } else if (anime.inform) {
    pointsCount = '待加载';
  }

  // 确保番剧有名称
  let animeName = anime.name_cn || anime.name || `番剧 #${animeId}`;

  // 如果番剧名称为空，尝试从全局数据中获取
  if ((animeName === `番剧 #${animeId}` || !animeName) && animeId && typeof allAnimeData === 'object' && allAnimeData[animeId]) {
    const globalAnime = allAnimeData[animeId];
    if (globalAnime.name_cn || globalAnime.name) {
      animeName = globalAnime.name_cn || globalAnime.name;
      console.log('从全局数据中获取番剧名称:', animeId, animeName);
    }
  }

  // 如果仍然没有名称，使用ID作为名称
  if (!animeName || animeName === `番剧 #${animeId}`) {
    console.log('番剧没有名称，使用ID作为名称:', animeId);
  }

  // 使用懒加载方式加载封面图片
  // 处理图片URL
  let coverUrl = anime.cover || 'https://via.placeholder.com/45x45';
  if (coverUrl && typeof updateImageUrl === 'function') {
    coverUrl = updateImageUrl(coverUrl);
  }

  animeItem.innerHTML = `
    <img class="anime-cover" src="loading.svg" data-src="${coverUrl}" alt="${animeName}" style="opacity: 0.6; transition: opacity 0.3s ease;">
    <div class="anime-info">
      <p class="anime-name">${animeName}</p>
      <p class="anime-points">${typeof pointsCount === 'number' ? pointsCount + '个地点' : pointsCount}</p>
    </div>
  `;

  animeItem.addEventListener('click', function() {
    // 确保有正确的番剧ID
    const animeId = animeItem.getAttribute('data-anime-id');
    console.log('点击番剧:', animeId, animeName);

    if (!animeId) {
      console.error('番剧ID不存在');
      return;
    }

    // 重置标志，表示不是从搜索结果进入的巡礼点列表
    mobileDrawerState.fromSearch = false;

    // 使用主脚本中的selectAnime函数选择番剧
    if (typeof selectAnime === 'function') {
      // 显示加载中提示
      const mobileAnimeList = document.getElementById('mobile-anime-list');
      mobileAnimeList.innerHTML = '<div class="loading-indicator">正在加载地点数据...</div>';

      // 先选择番剧，这会在地图上显示该番剧的所有地点
      selectAnime(animeId);

      // 确保已加载该番剧的地点数据
      const anime = allAnimeData[animeId];
      if (!anime.points || !Array.isArray(anime.points)) {
        // 加载地点数据并显示地点列表
        if (typeof loadAnimePoints === 'function') {
          console.log('开始加载番剧地点数据:', animeId);
          loadAnimePoints(animeId).then((pointsData) => {
            console.log('番剧地点数据加载成功:', animeId, pointsData ? pointsData.length : 0);
            // 加载完成后显示地点列表
            showMobileAnimePoints(allAnimeData[animeId], animeId);
          }).catch(error => {
            console.error('加载地点数据失败:', error);
            // 即使加载失败，也尝试显示地点列表
            showMobileAnimePoints(allAnimeData[animeId], animeId);
          });
        } else {
          // 如果加载函数不可用，仍然尝试显示地点列表
          console.warn('loadAnimePoints函数不可用，使用现有数据');
          showMobileAnimePoints(anime, animeId);
        }
      } else {
        // 如果已经有地点数据，直接显示地点列表
        showMobileAnimePoints(anime, animeId);
      }
    } else {
      console.error('selectAnime函数不可用');
    }
  });

  return animeItem;
}

// 过滤移动端番剧列表
function filterMobileAnimeList(searchTerm) {
  const animeItems = document.querySelectorAll('#mobile-anime-list .anime-item');
  let hasResults = false;

  // 如果没有搜索词，显示所有项目
  if (!searchTerm) {
    animeItems.forEach(item => {
      item.style.display = 'flex';
    });

    // 移除可能存在的无结果提示
    const noResultsElement = document.querySelector('#mobile-anime-list .no-results');
    if (noResultsElement) {
      noResultsElement.remove();
    }
    return;
  }

  animeItems.forEach(item => {
    const animeName = item.querySelector('.anime-name').textContent.toLowerCase();
    if (animeName.includes(searchTerm)) {
      item.style.display = 'flex';
      hasResults = true;
    } else {
      item.style.display = 'none';
    }
  });

  // 检查是否有可见的结果
  const noResultsElement = document.querySelector('#mobile-anime-list .no-results');

  if (!hasResults && !noResultsElement) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = '没有找到匹配的番剧';
    document.getElementById('mobile-anime-list').appendChild(noResults);
  } else if (hasResults && noResultsElement) {
    noResultsElement.remove();
  }
}

// 简单的移动端搜索功能
function searchMobileAnimeList(searchTerm) {
  const results = [];
  const searchLower = searchTerm.toLowerCase();

  // 如果有全局番剧数据，使用它来搜索
  if (typeof allAnimeData === 'object') {
    for (const [id, anime] of Object.entries(allAnimeData)) {
      const name = (anime.name || '').toLowerCase();
      const nameCn = (anime.name_cn || '').toLowerCase();

      if (name.includes(searchLower) || nameCn.includes(searchLower)) {
        results.push({ id, anime });
      }
    }

    // 渲染搜索结果
    const mobileAnimeList = document.getElementById('mobile-anime-list');
    mobileAnimeList.innerHTML = '';

    if (results.length === 0) {
      mobileAnimeList.innerHTML = '<div class="no-results">没有找到匹配的番剧</div>';
    } else {
      results.forEach(({ id, anime }) => {
        const animeItem = document.createElement('div');
        animeItem.className = 'anime-item';
        animeItem.dataset.id = id;

        // 如果是当前选中的番剧，添加active类
        if (currentAnime === id) {
          animeItem.classList.add('active');
        }

        let pointsCount = 0;
        if (anime.points && Array.isArray(anime.points)) {
          pointsCount = anime.points.length;
        } else if (anime.inform) {
          pointsCount = '待加载';
        }

        animeItem.innerHTML = `
          <img class="anime-cover" src="loading.svg" data-src="${updateImageUrl(anime.cover) || 'loading.svg'}" alt="${anime.name || anime.name_cn}">
          <div class="anime-info">
            <p class="anime-name">${anime.name_cn || anime.name}</p>
            <p class="anime-points">${pointsCount} ${typeof pointsCount === 'number' ? '个地点' : ''}</p>
          </div>
        `;

        animeItem.addEventListener('click', () => {
          // 显示加载中提示
          const mobileAnimeList = document.getElementById('mobile-anime-list');
          mobileAnimeList.innerHTML = '<div class="loading-indicator">正在加载地点数据...</div>';

          // 先选择番剧，这会在地图上显示该番剧的所有地点
          selectAnime(id);

          // 确保已加载该番剧的地点数据
          const anime = allAnimeData[id];
          if (!anime.points || !Array.isArray(anime.points)) {
            // 加载地点数据并显示地点列表
            if (typeof loadAnimePoints === 'function') {
              console.log('开始加载番剧地点数据:', id);
              loadAnimePoints(id).then((pointsData) => {
                console.log('番剧地点数据加载成功:', id, pointsData ? pointsData.length : 0);
                // 加载完成后显示地点列表
                showMobileAnimePoints(allAnimeData[id], id);
              }).catch(error => {
                console.error('加载地点数据失败:', error);
                // 即使加载失败，也尝试显示地点列表
                showMobileAnimePoints(allAnimeData[id], id);
              });
            } else {
              // 如果加载函数不可用，仍然尝试显示地点列表
              console.warn('loadAnimePoints函数不可用，使用现有数据');
              showMobileAnimePoints(anime, id);
            }
          } else {
            // 如果已经有地点数据，直接显示地点列表
            showMobileAnimePoints(anime, id);
          }
        });

        mobileAnimeList.appendChild(animeItem);
      });
    }
  } else {
    // 如果没有全局数据，尝试使用DOM搜索
    filterMobileAnimeList(searchTerm);
  }

  return results;
}

// 显示移动端番剧地点列表
function showMobileAnimePoints(anime, animeId) {
  // 更新抽屉状态
  mobileDrawerState.type = 'anime-points';
  mobileDrawerState.animeId = animeId;
  mobileDrawerState.scrollPosition = 0; // 重置滚动位置
  saveDrawerState();

  const mobileAnimeList = document.getElementById('mobile-anime-list');

  // 创建一个临时容器，用于动画过渡
  const tempContainer = document.createElement('div');
  tempContainer.className = 'points-list-entering';

  // 创建返回按钮
  const backButton = document.createElement('div');
  backButton.className = 'back-button animated';

  // 根据来源显示不同的返回按钮文本
  if (mobileDrawerState.fromSearch && mobileDrawerState.searchTerm) {
    backButton.innerHTML = '<i class="bi bi-arrow-left"></i> 返回搜索结果';
  } else {
    backButton.innerHTML = '<i class="bi bi-arrow-left"></i> 返回番剧列表';
  }

  backButton.addEventListener('click', () => {
    // 添加退出动画
    const currentContent = document.querySelector('#mobile-anime-list > div');
    if (currentContent) {
      currentContent.classList.add('points-list-exiting');

      // 等待动画完成后再切换回番剧列表
      setTimeout(() => {
        // 切换回全部模式，显示所有番剧的标记点
        if (typeof setMode === 'function') {
          currentMode = 'all';
          currentAnime = null;
          setMode('all');
        }

        // 展开抽屉
        const drawer = document.getElementById('mobile-drawer');
        drawer.classList.add('expanded');
        drawer.style.height = '';
        drawer.style.transform = '';

        // 根据来源返回不同的页面
        if (mobileDrawerState.fromSearch && mobileDrawerState.searchTerm) {
          // 返回搜索结果
          console.log('返回搜索结果:', mobileDrawerState.searchTerm);

          // 设置搜索框的值
          const mobileSearchInput = document.getElementById('mobile-search-input');
          if (mobileSearchInput) {
            mobileSearchInput.value = mobileDrawerState.searchTerm;
          }

          // 执行搜索
          if (typeof window.searchAnimeAndPoints === 'function' && typeof window.searchLocation === 'function') {
            Promise.all([
              window.searchAnimeAndPoints(mobileDrawerState.searchTerm),
              window.searchLocation(mobileDrawerState.searchTerm)
            ]).then(([animeResults, locationResults]) => {
              // 合并搜索结果
              const combinedResults = {
                animes: animeResults.animes || [],
                points: animeResults.points || [],
                locations: locationResults || []
              };

              // 渲染搜索结果
              renderMobileSearchResults(combinedResults);
            }).catch(error => {
              console.error('恢复搜索结果失败:', error);
              loadMobileAnimeList(); // 失败时回退到番剧列表
            });
          } else {
            // 如果搜索函数不可用，回退到番剧列表
            console.log('搜索函数不可用，回退到番剧列表');
            loadMobileAnimeList();
          }

          // 重置标志
          mobileDrawerState.fromSearch = false;
        } else {
          // 返回番剧列表
          loadMobileAnimeList();
        }
      }, 300); // 与动画时间保持一致
    } else {
      // 如果没有当前内容，直接返回
      if (typeof setMode === 'function') {
        currentMode = 'all';
        currentAnime = null;
        setMode('all');
      }
      loadMobileAnimeList();
    }
  });
  tempContainer.appendChild(backButton);

  // 创建番剧封面头部区域
  const coverHeader = document.createElement('div');
  coverHeader.className = 'anime-cover-header animated';

  // 创建背景图层
  const coverBg = document.createElement('div');
  coverBg.className = 'anime-cover-bg';
  coverBg.style.backgroundImage = `url('${updateImageUrl(anime.cover)}')`;
  coverHeader.appendChild(coverBg);

  // 创建毛玻璃效果层
  const coverGlass = document.createElement('div');
  coverGlass.className = 'anime-cover-glass';
  coverHeader.appendChild(coverGlass);

  // 创建渐变层
  const coverGradient = document.createElement('div');
  coverGradient.className = 'anime-cover-gradient';
  coverHeader.appendChild(coverGradient);

  // 创建封面图
  const coverImage = document.createElement('img');
  coverImage.className = 'anime-cover-image';
  coverImage.src = updateImageUrl(anime.cover);
  coverImage.alt = anime.name_cn || anime.name;
  coverHeader.appendChild(coverImage);

  // 创建番剧名称
  const coverName = document.createElement('h4');
  coverName.className = 'anime-cover-name';
  coverName.textContent = anime.name_cn || anime.name;
  coverHeader.appendChild(coverName);

  // 创建巡礼点数量
  const pointsCount = anime.points && Array.isArray(anime.points) ? anime.points.length : 0;
  const coverCount = document.createElement('p');
  coverCount.className = 'anime-cover-count';
  coverCount.textContent = `${pointsCount} 个巡礼地点`;
  coverHeader.appendChild(coverCount);

  tempContainer.appendChild(coverHeader);

  // 确保已加载该番剧的地点数据
  if (!anime.points || !Array.isArray(anime.points)) {
    // 显示加载中提示
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = '正在加载地点数据...';
    tempContainer.appendChild(loadingIndicator);

    // 尝试加载地点数据
    if (typeof loadAnimePoints === 'function') {
      console.log('开始加载番剧地点数据:', animeId);
      loadAnimePoints(animeId).then((pointsData) => {
        console.log('番剧地点数据加载成功:', animeId, pointsData.length);
        // 重新调用显示地点列表
        showMobileAnimePoints(allAnimeData[animeId], animeId);
      }).catch(error => {
        console.error('加载地点数据失败:', error);
        mobileAnimeList.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'no-results';
        errorDiv.textContent = '加载地点数据失败，请重试';
        mobileAnimeList.appendChild(errorDiv);
      });
    } else {
      console.error('loadAnimePoints函数不可用');
      mobileAnimeList.innerHTML = '';
      const errorDiv = document.createElement('div');
      errorDiv.className = 'no-results';
      errorDiv.textContent = '无法加载地点数据，请刷新页面';
      mobileAnimeList.appendChild(errorDiv);
    }

    // 将临时容器添加到列表中
    mobileAnimeList.innerHTML = '';
    mobileAnimeList.appendChild(tempContainer);
    return;
  }

  // 创建地点列表容器
  const pointsContainer = document.createElement('div');
  pointsContainer.className = 'points-container';
  pointsContainer.style.marginTop = '15px'; // 与上方内容保持一定间距

  if (anime.points.length > 0) {
    // 添加地点列表标题
    const pointsTitle = document.createElement('h5');
    pointsTitle.className = 'points-title';
    pointsTitle.textContent = '巡礼地点列表';
    pointsTitle.style.margin = '0 0 15px 15px';
    pointsTitle.style.color = 'var(--primary-text)';
    pointsTitle.style.fontWeight = '600';
    pointsTitle.style.fontSize = '16px';
    pointsContainer.appendChild(pointsTitle);

    const pointsList = document.createElement('div');
    pointsList.className = 'points-list';

    anime.points.forEach((point, index) => {
      const pointItem = document.createElement('div');
      pointItem.className = 'point-item animated';

      // 添加数据属性，用于滑动菜单识别巡礼点数据
      pointItem.dataset.id = point.id;
      pointItem.dataset.pointId = point.id;
      pointItem.dataset.animeId = animeId;

      // 如果有图片，显示图片
      let imageUrl = point.image || anime.cover || 'https://via.placeholder.com/45x45';
      // 处理图片URL
      if (imageUrl && typeof updateImageUrl === 'function') {
        imageUrl = updateImageUrl(imageUrl);
      }

      pointItem.innerHTML = `
        <img src="${imageUrl}" alt="${point.name || point.cn || '未命名地点'}" class="point-cover">
        <div class="point-info">
          <p class="point-name">${point.name || point.cn || '未命名地点'}</p>
          <p class="point-episode">${point.ep ? '第' + point.ep + '集' : ''}</p>
        </div>
      `;

      // 添加点击事件
      pointItem.addEventListener('click', () => {
        // 使用主脚本中的函数显示地点信息
        if (typeof showPointInfo === 'function') {
          showPointInfo(point, anime, animeId);
        }

        // 如果有地理坐标，将地图定位到该点
        if (point.geo && point.geo.length === 2 && map) {
          map.setView([point.geo[0], point.geo[1]], 16);

          // 尝试找到对应的标记点并点击
          if (markers && markers.length > 0) {
            for (const marker of markers) {
              if (marker.pointData &&
                  marker.pointData.point.id === point.id &&
                  marker.pointData.animeId === animeId) {
                marker.fire('click');
                break;
              }
            }
          }
        }

        // 点击后收起抽屉
        const drawer = document.getElementById('mobile-drawer');
        const drawerContent = drawer ? drawer.querySelector('.mobile-drawer-content') : null;

        // 保存滚动位置和状态
        if (drawerContent) {
          mobileDrawerState.scrollPosition = drawerContent.scrollTop;
          saveDrawerState();
        }

        drawer.classList.remove('expanded');
        drawer.style.height = '';
        drawer.style.transform = '';
      });

      pointsList.appendChild(pointItem);
    });

    pointsContainer.appendChild(pointsList);
    tempContainer.appendChild(pointsContainer);
  } else {
    // 如果没有地点数据
    const noPoints = document.createElement('div');
    noPoints.className = 'no-results';
    noPoints.textContent = '暂无巡礼地点数据';
    pointsContainer.appendChild(noPoints);
    tempContainer.appendChild(pointsContainer);
  }

  // 将临时容器添加到列表中
  mobileAnimeList.innerHTML = '';
  mobileAnimeList.appendChild(tempContainer);

  // 展开抽屉
  const drawer = document.getElementById('mobile-drawer');
  drawer.classList.add('expanded');
  drawer.style.height = '';
  drawer.style.transform = '';
}

// 处理番剧名称链接点击事件 - 在抽屉中显示该番剧的所有巡礼地点
function handleAnimeNameLinkClick(animeId, anime) {
  console.log('点击番剧名称链接:', animeId, anime.name_cn || anime.name);

  // 确保有正确的番剧ID
  if (!animeId) {
    console.error('番剧ID不存在');
    return;
  }

  // 如果是桌面版，使用桌面版的显示方式
  if (window.innerWidth > 768) {
    console.log('桌面版使用selectAnime函数');
    if (typeof selectAnime === 'function') {
      selectAnime(animeId);
    }
    return;
  }

  // 确保抽屉可见
  const drawer = document.getElementById('mobile-drawer');
  if (drawer.style.display === 'none') {
    drawer.style.display = 'flex';
  }

  // 显示加载中提示
  const mobileAnimeList = document.getElementById('mobile-anime-list');
  mobileAnimeList.innerHTML = '<div class="loading-indicator">正在加载地点数据...</div>';

  // 展开抽屉
  drawer.classList.add('expanded');
  drawer.style.height = '';
  drawer.style.transform = '';

  // 先选择番剧，这会在地图上显示该番剧的所有地点
  if (typeof selectAnime === 'function') {
    // selectAnime函数会自动处理移动版的显示
    selectAnime(animeId);
  } else {
    // 如果selectAnime函数不可用，手动处理
    // 确保已加载该番剧的地点数据
    if (!anime.points || !Array.isArray(anime.points)) {
      // 加载地点数据并显示地点列表
      if (typeof loadAnimePoints === 'function') {
        console.log('开始加载番剧地点数据:', animeId);
        loadAnimePoints(animeId).then((pointsData) => {
          console.log('番剧地点数据加载成功:', animeId, pointsData ? pointsData.length : 0);
          // 加载完成后显示地点列表
          showMobileAnimePoints(allAnimeData[animeId], animeId);
        }).catch(error => {
          console.error('加载地点数据失败:', error);
          // 即使加载失败，也尝试显示地点列表
          showMobileAnimePoints(allAnimeData[animeId], animeId);
        });
      } else {
        // 如果加载函数不可用，仍然尝试显示地点列表
        console.warn('loadAnimePoints函数不可用，使用现有数据');
        showMobileAnimePoints(anime, animeId);
      }
    } else {
      // 如果已经有地点数据，直接显示地点列表
      showMobileAnimePoints(anime, animeId);
    }
  }
}

// 渲染移动端搜索结果
function renderMobileSearchResults(searchResults) {
  // 更新抽屉状态
  mobileDrawerState.type = 'search-results';
  mobileDrawerState.searchTerm = document.getElementById('mobile-search-input').value.trim();
  mobileDrawerState.scrollPosition = 0; // 重置滚动位置
  saveDrawerState();

  const mobileAnimeList = document.getElementById('mobile-anime-list');
  mobileAnimeList.innerHTML = '';

  // 创建返回按钮
  const backButton = document.createElement('div');
  backButton.className = 'back-button';
  backButton.innerHTML = '<i class="bi bi-arrow-left"></i> 返回番剧列表';
  backButton.addEventListener('click', () => {
    // 清空搜索框
    document.getElementById('mobile-search-input').value = '';
    document.getElementById('search-input').value = '';

    // 更新抽屉状态
    mobileDrawerState.type = 'anime-list';
    mobileDrawerState.searchTerm = '';
    saveDrawerState();

    // 返回番剧列表
    loadMobileAnimeList();
  });
  mobileAnimeList.appendChild(backButton);

  // 如果没有任何搜索结果
  if (searchResults.animes.length === 0 && searchResults.points.length === 0 && (!searchResults.locations || searchResults.locations.length === 0)) {
    mobileAnimeList.appendChild(document.createElement('div')).className = 'no-results';
    mobileAnimeList.lastChild.textContent = '没有找到匹配的结果';
    return;
  }

  // 1. 渲染番剧结果
  if (searchResults.animes.length > 0) {
    const animeSection = document.createElement('div');
    animeSection.className = 'search-section';
    animeSection.innerHTML = '<h6 class="search-category">番剧</h6>';

    searchResults.animes.forEach(({ id, anime }) => {
      const animeItem = document.createElement('div');
      animeItem.className = 'anime-item';
      animeItem.dataset.id = id;

      // 如果是当前选中的番剧，添加active类
      if (currentAnime === id) {
        animeItem.classList.add('active');
      }

      let pointsCount = 0;
      if (anime.points && Array.isArray(anime.points)) {
        pointsCount = anime.points.length;
      } else if (anime.inform) {
        pointsCount = '待加载';
      }

      animeItem.innerHTML = `
        <img class="anime-cover" src="loading.svg" data-src="${updateImageUrl(anime.cover) || 'loading.svg'}" alt="${anime.name || anime.name_cn}">
        <div class="anime-info">
          <p class="anime-name">${anime.name_cn || anime.name}</p>
          <p class="anime-points">${pointsCount} ${typeof pointsCount === 'number' ? '个地点' : ''}</p>
        </div>
      `;

      animeItem.addEventListener('click', () => {
        // 显示加载中提示
        const mobileAnimeList = document.getElementById('mobile-anime-list');
        mobileAnimeList.innerHTML = '<div class="loading-indicator">正在加载地点数据...</div>';

        // 先选择番剧，这会在地图上显示该番剧的所有地点
        selectAnime(id);

        // 确保已加载该番剧的地点数据
        const anime = allAnimeData[id];
        if (!anime.points || !Array.isArray(anime.points)) {
          // 加载地点数据并显示地点列表
          if (typeof loadAnimePoints === 'function') {
            console.log('开始加载番剧地点数据:', id);
            loadAnimePoints(id).then((pointsData) => {
              console.log('番剧地点数据加载成功:', id, pointsData ? pointsData.length : 0);
              // 设置标志，表示是从搜索结果进入的巡礼点列表
              mobileDrawerState.fromSearch = true;
              mobileDrawerState.searchTerm = document.getElementById('mobile-search-input').value.trim();

              // 加载完成后显示地点列表
              showMobileAnimePoints(allAnimeData[id], id);
            }).catch(error => {
              console.error('加载地点数据失败:', error);
              // 设置标志，表示是从搜索结果进入的巡礼点列表
              mobileDrawerState.fromSearch = true;
              mobileDrawerState.searchTerm = document.getElementById('mobile-search-input').value.trim();

              // 即使加载失败，也尝试显示地点列表
              showMobileAnimePoints(allAnimeData[id], id);
            });
          } else {
            // 如果加载函数不可用，仍然尝试显示地点列表
            console.warn('loadAnimePoints函数不可用，使用现有数据');

            // 设置标志，表示是从搜索结果进入的巡礼点列表
            mobileDrawerState.fromSearch = true;
            mobileDrawerState.searchTerm = document.getElementById('mobile-search-input').value.trim();

            showMobileAnimePoints(anime, id);
          }
        } else {
          // 如果已经有地点数据，直接显示地点列表

          // 设置标志，表示是从搜索结果进入的巡礼点列表
          mobileDrawerState.fromSearch = true;
          mobileDrawerState.searchTerm = document.getElementById('mobile-search-input').value.trim();

          showMobileAnimePoints(anime, id);
        }
      });

      animeSection.appendChild(animeItem);
    });

    mobileAnimeList.appendChild(animeSection);
  }

  // 2. 渲染巡礼点结果
  if (searchResults.points.length > 0) {
    const pointsSection = document.createElement('div');
    pointsSection.className = 'search-section';
    pointsSection.innerHTML = '<h6 class="search-category">巡礼地点</h6>';

    searchResults.points.forEach(({ point, animeId, anime }) => {
      const pointItem = document.createElement('div');
      pointItem.className = 'point-item';

      // 添加数据属性，用于滑动菜单识别巡礼点数据
      pointItem.dataset.id = point.id;
      pointItem.dataset.pointId = point.id;
      pointItem.dataset.animeId = animeId;

      pointItem.innerHTML = `
        <img src="${point.image || anime.cover || 'https://via.placeholder.com/45x45'}" alt="${point.name || point.cn}" class="point-cover">
        <div class="point-info">
          <p class="point-name">${point.name || point.cn || '未命名地点'}</p>
          <p class="anime-title">${anime.name_cn || anime.name}</p>
        </div>
      `;

      pointItem.addEventListener('click', function() {
        // 使用主脚本中的函数显示地点信息
        if (typeof window.showPointInfo === 'function') {
          window.showPointInfo(point, anime, animeId);
        }

        // 如果有地理坐标，将地图定位到该点
        if (point.geo && point.geo.length === 2 && typeof map !== 'undefined') {
          map.setView([point.geo[0], point.geo[1]], 16);
        }

        // 点击后收起抽屉
        const drawer = document.getElementById('mobile-drawer');
        const drawerContent = drawer ? drawer.querySelector('.mobile-drawer-content') : null;

        // 保存滚动位置和状态
        if (drawerContent) {
          mobileDrawerState.scrollPosition = drawerContent.scrollTop;
          saveDrawerState();
        }

        drawer.classList.remove('expanded');
        drawer.style.height = '';
        drawer.style.transform = '';
      });

      pointsSection.appendChild(pointItem);
    });

    mobileAnimeList.appendChild(pointsSection);
  }

  // 3. 渲染地图位置搜索结果
  if (searchResults.locations && searchResults.locations.length > 0) {
    const locationSection = document.createElement('div');
    locationSection.className = 'search-section';
    locationSection.innerHTML = '<h6 class="search-category">地图位置</h6>';

    searchResults.locations.forEach(location => {
      const locationItem = document.createElement('div');
      locationItem.className = 'location-item';

      // 提取地址信息
      const address = location.properties;
      const mainName = address.amenity || address.building || address.road || '';
      const subName = [
        address.city || address.town || address.village,
        address.province || address.state,
        address.country
      ].filter(Boolean).join(', ');

      locationItem.innerHTML = `
        <div class="location-info">
          <p class="location-name">${mainName || location.name}</p>
          <p class="location-address">${subName || location.name}</p>
        </div>
      `;

      locationItem.addEventListener('click', () => {
        // 移动地图到该位置
        // 使用全局map变量而不是window.map
        if (typeof map !== 'undefined') {
          if (location.bbox) {
            // 确保bbox是Leaflet可以理解的格式
            try {
              // 如果bbox是数组格式 [minLat, minLng, maxLat, maxLng]
              if (Array.isArray(location.bbox) && location.bbox.length === 4) {
                const bounds = [
                  [location.bbox[0], location.bbox[1]],
                  [location.bbox[2], location.bbox[3]]
                ];
                map.fitBounds(bounds);
              } else if (location.bbox.length === 2) {
                // 如果bbox是两个点的格式 [[lat1, lng1], [lat2, lng2]]
                map.fitBounds(location.bbox);
              } else {
                // 如果bbox格式不正确，使用中心点
                map.setView([location.center.lat, location.center.lng], 16);
              }
            } catch (error) {
              console.error('处理bbox时出错:', error);
              // 出错时使用中心点
              map.setView([location.center.lat, location.center.lng], 16);
            }
          } else {
            map.setView([location.center.lat, location.center.lng], 16);
          }

          // 点击后收起抽屉
          const drawer = document.getElementById('mobile-drawer');
          const drawerContent = drawer ? drawer.querySelector('.mobile-drawer-content') : null;

          // 保存滚动位置和状态
          if (drawerContent) {
            mobileDrawerState.scrollPosition = drawerContent.scrollTop;
            saveDrawerState();
          }

          drawer.classList.remove('expanded');
          drawer.style.height = '';
          drawer.style.transform = '';
        } else {
          console.error('地图对象不可用');
        }
      });

      locationSection.appendChild(locationItem);
    });

    mobileAnimeList.appendChild(locationSection);
  }
}