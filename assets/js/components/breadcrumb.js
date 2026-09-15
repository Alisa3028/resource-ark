/* ==========================================================================
   components/breadcrumb.js —— 面包屑导航
   --------------------------------------------------------------------------
   多层页面（首页 > 大分类 > 子分类 > 资源）之间随时可回溯路径。
   用法：Ark.breadcrumb.render(host, [{text:'全部资源', href:'#/search', icon:'search'}, ...])
   首项会固定补上「首页」；href 一律用 Ark.router.href() 生成。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.breadcrumb = (function () {
  var U = Ark.utils;
  var I = Ark.icons;

  function render(host, items) {
    if (!host) return;
    host.classList.add('crumb');
    host.innerHTML = '';
    host.setAttribute('aria-label', '面包屑导航');

    // 首项固定为首页
    var all = [{ text: '首页', icon: 'home', href: Ark.router.href('home') }].concat(items || []);

    all.forEach(function (it, i) {
      var last = i === all.length - 1;
      var iconName = it.icon && I.has(it.icon) ? it.icon : null;
      var inner;
      if (it.href && !last) {
        inner = U.el('a', { href: it.href }, [
          iconName ? I.el(iconName, { size: 14 }) : null,
          U.el('span', { text: it.text })
        ]);
      } else {
        inner = U.el('span', {}, [
          iconName ? I.el(iconName, { size: 14 }) : null,
          U.el('span', { text: it.text })
        ]);
      }
      host.appendChild(U.el('span.crumb-item' + (last ? '.current' : '') + (it.pill ? '.crumb-pill' : ''), {}, inner));
      if (!last) host.appendChild(I.el('right', { size: 12, cls: 'crumb-sep' }));
    });

    // 注入结构化数据，利于搜索引擎理解层级
    try {
      var ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: all.map(function (it, i) {
          return { '@type': 'ListItem', position: i + 1, name: it.text, item: it.href || location.href };
        })
      });
      document.head.appendChild(ld);
    } catch (e) { /* 忽略 */ }
  }

  /** 常用组合：分类页面包屑 */
  function forCategory(cat, sub) {
    var out = [{ text: '全部资源', href: Ark.router.href('search'), icon: 'search' }];
    if (cat) out.push({ text: cat.name, href: Ark.router.href('category', { cat: cat.id }), icon: Ark.icons.catIcon(cat) });
    if (sub) out.push({ text: sub.name, icon: 'folder' });
    return out;
  }

  return { render: render, forCategory: forCategory };
})();
