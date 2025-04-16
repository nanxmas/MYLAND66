// 处理巡礼点卡片中的按钮展开/收起功能
document.addEventListener('DOMContentLoaded', function() {
  // 初始化展开按钮功能
  initExpandButtonsFeature();
});

// 初始化展开按钮功能
function initExpandButtonsFeature() {
  // 如果不是移动端，直接返回
  if (window.innerWidth > 768) return;

  // 获取展开按钮元素
  const expandButtonsBtn = document.getElementById('expand-buttons-btn');

  // 如果按钮不存在，直接返回
  if (!expandButtonsBtn) return;

  // 确保展开按钮在移动端可见
  expandButtonsBtn.classList.remove('d-none');
  expandButtonsBtn.classList.add('d-flex');

  // 获取次要按钮容器
  const secondaryButtons = document.querySelector('.map-links .secondary-buttons');
  // 获取信息卡片
  const infoCard = document.getElementById('info-card');

  // 设置卡片高度 - 只在移动端生效
  function adjustCardHeight(isExpanded) {
    // 如果不是移动端，直接返回
    if (window.innerWidth > 768) {
      // 桌面端始终保持自适应高度
      infoCard.style.height = 'auto';
      return;
    }

    // 等待DOM更新
    setTimeout(() => {
      // 获取卡片内容高度
      const cardBody = infoCard.querySelector('.card-body');
      if (cardBody) {
        // 如果展开状态，计算展开后的高度
        if (isExpanded) {
          // 计算展开后的高度，但不要太高
          const primaryButtons = infoCard.querySelector('.primary-buttons');
          const secondaryButtonsHeight = secondaryButtons.scrollHeight;
          const imageContainer = infoCard.querySelector('.col-md-6:first-child');
          const titleArea = infoCard.querySelector('.card-title');
          const animeNameArea = infoCard.querySelector('#anime-name');
          const episodeInfo = infoCard.querySelector('#episode-info');

          let totalHeight = 0;
          if (imageContainer) totalHeight += imageContainer.offsetHeight;
          if (titleArea) totalHeight += titleArea.offsetHeight;
          if (animeNameArea) totalHeight += animeNameArea.offsetHeight;
          if (episodeInfo) totalHeight += episodeInfo.offsetHeight;
          if (primaryButtons) totalHeight += primaryButtons.offsetHeight;
          totalHeight += secondaryButtonsHeight;

          // 添加一些额外的空间用于内边距
          totalHeight += 70;

          infoCard.style.height = `${totalHeight}px`;
        } else {
          // 如果收起状态，计算并设置卡片高度
          // 给卡片设置一个紧凑的高度
          const primaryButtons = infoCard.querySelector('.primary-buttons');
          const imageContainer = infoCard.querySelector('.col-md-6:first-child');
          const titleArea = infoCard.querySelector('.card-title');
          const animeNameArea = infoCard.querySelector('#anime-name');
          const episodeInfo = infoCard.querySelector('#episode-info');

          let totalHeight = 0;
          if (imageContainer) totalHeight += imageContainer.offsetHeight;
          if (titleArea) totalHeight += titleArea.offsetHeight;
          if (animeNameArea) totalHeight += animeNameArea.offsetHeight;
          if (episodeInfo) totalHeight += episodeInfo.offsetHeight;
          if (primaryButtons) totalHeight += primaryButtons.offsetHeight;

          // 添加一些额外的空间用于内边距
          totalHeight += 60; // 根据需要调整这个值，确保卡片不会太紧凑

          infoCard.style.height = `${totalHeight}px`;
        }
      }
    }, 10);
  }

  // 绑定点击事件
  expandButtonsBtn.addEventListener('click', function() {
    // 切换展开状态
    const isExpanded = secondaryButtons.classList.contains('expanded');

    if (isExpanded) {
      // 收起按钮
      secondaryButtons.classList.remove('expanded');
      expandButtonsBtn.classList.remove('expanded');
      expandButtonsBtn.innerHTML = '<i class="bi bi-three-dots"></i>';
      expandButtonsBtn.setAttribute('title', '展开更多功能');
      adjustCardHeight(false);
    } else {
      // 展开按钮
      secondaryButtons.classList.add('expanded');
      expandButtonsBtn.classList.add('expanded');
      expandButtonsBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
      expandButtonsBtn.setAttribute('title', '收起功能');
      adjustCardHeight(true);
    }
  });

  // 在信息卡片显示时重置展开按钮状态
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName === 'class') {
        const isVisible = !infoCard.classList.contains('d-none');
        if (isVisible) {
          // 信息卡片显示时，重置展开按钮状态为收起
          secondaryButtons.classList.remove('expanded');
          expandButtonsBtn.classList.remove('expanded');
          expandButtonsBtn.innerHTML = '<i class="bi bi-three-dots"></i>';
          // 调整卡片高度
          adjustCardHeight(false);
        }
      }
    });
  });

  // 监听信息卡片的class属性变化
  observer.observe(infoCard, { attributes: true });

  // 监听窗口大小变化，调整卡片高度和展开按钮显示
  window.addEventListener('resize', function() {
    // 如果是桌面端，隐藏展开按钮并重置卡片高度
    if (window.innerWidth > 768) {
      expandButtonsBtn.classList.add('d-none');
      expandButtonsBtn.classList.remove('d-flex');
      infoCard.style.height = 'auto';

      // 确保所有按钮在桌面端可见
      secondaryButtons.classList.add('expanded');
    } else {
      // 移动端显示展开按钮
      expandButtonsBtn.classList.remove('d-none');
      expandButtonsBtn.classList.add('d-flex');

      // 调整卡片高度
      const isExpanded = secondaryButtons.classList.contains('expanded');
      adjustCardHeight(isExpanded);
    }
  });

  // 初始化时调整卡片高度
  // 使用 MutationObserver 监听卡片内容变化，确保在内容加载后调整高度
  const contentObserver = new MutationObserver(function(mutations) {
    // 当卡片内容变化时，调整高度
    if (!infoCard.classList.contains('d-none')) {
      adjustCardHeight(false);
    }
  });

  // 监听卡片内容变化
  contentObserver.observe(infoCard, { childList: true, subtree: true });

  // 初始调整
  adjustCardHeight(false);
}
