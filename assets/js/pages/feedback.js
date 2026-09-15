/* ==========================================================================
   pages/feedback.js —— 反馈建议（死链反馈 / 站点建议），无需后端
   --------------------------------------------------------------------------
   三种提交方式，都不依赖服务器：
     1) 有第三方表单地址（data/site.json 的 feedbackEmbedUrl）-> 直接 iframe 嵌入
     2) 一键生成邮件（mailto:），内容结构化
     3) 一键跳转 GitHub Issues，自动带上标题与正文
     4) 兜底：复制反馈内容，用户自行粘贴到任意渠道
   ========================================================================== */
Ark.pages = Ark.pages || {};

Ark.pages.feedback = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var crumb = document.getElementById('ark-crumb');
  var site = Ark.data.getSite();
  var q = U.parseQuery();

  Ark.breadcrumb.render(crumb, [{ text: '反馈建议', icon: 'mail' }]);

  var TYPES = [
    { id: 'deadlink', icon: 'link',   name: '死链反馈', ph: '打不开、跳转到错误页面、域名已过期…' },
    { id: 'info',     icon: 'book',   name: '信息纠错', ph: '名称、描述、标签、分类有误…' },
    { id: 'suggest',  icon: 'wand',   name: '站点建议', ph: '功能想法、界面体验、希望增加的能力…' },
    { id: 'submit',   icon: 'plus',   name: '推荐资源', ph: '推荐一个值得收录的优质网站…' },
    { id: 'other',    icon: 'mail',   name: '其他',    ph: '任何想说的…' }
  ];

  var state = { type: 'deadlink' };

  /* 从详情页带过来的资源 id 自动填充 */
  var pre = q.id ? Ark.data.getResource(q.id) : null;
  if (pre) state.type = 'deadlink';

  /* ---------------------------------------------------- 表单 */
  var typeBox = U.el('div.fb-type');
  TYPES.forEach(function (t) {
    var b = U.el('button.btn.btn-xs' + (t.id === state.type ? '.btn-primary' : '.btn-soft'), {
      type: 'button', dataset: { t: t.id }, 'aria-pressed': t.id === state.type ? 'true' : 'false'
    }, [I.el(t.icon, { size: 13 }), U.el('span', { text: t.name })]);
    b.addEventListener('click', function () {
      state.type = t.id;
      U.$$('button', typeBox).forEach(function (x) {
        x.className = 'btn btn-xs btn-soft';
        x.setAttribute('aria-pressed', 'false');
      });
      b.className = 'btn btn-xs btn-primary';
      b.setAttribute('aria-pressed', 'true');
      desc.setAttribute('placeholder', t.ph);
    });
    typeBox.appendChild(b);
  });

  function fieldRow(label, node, req) {
    return U.el('div.row', {}, [
      U.el('label', {}, [U.el('span', { text: label }), req ? U.el('span.req', { text: ' *' }) : null]),
      node
    ]);
  }

  var nameInput = U.el('input.field', { type: 'text', placeholder: '例如：某某教程网', value: pre ? pre.name : '' });
  var urlInput = U.el('input.field', { type: 'text', placeholder: '例如：#/detail?id=xxx 或 https://…', value: pre ? (pre.url) : '' });
  var desc = U.el('textarea.field', { placeholder: TYPES[0].ph });
  var contact = U.el('input.field', { type: 'text', placeholder: '邮箱或其它联系方式（选填，便于回复你）' });

  var hint = U.el('div.sm.dim', { style: { marginTop: '-4px', marginBottom: '12px' }, text: '表单不会自动上传任何内容，点击下方按钮后由你自己确认发送。' });

  var form = U.el('div.panel.panel-pad.fb-form', {}, [
    U.el('h3', { text: '提交反馈' }),
    U.el('p.sm.muted', { style: { marginTop: '6px', marginBottom: '16px' },
      text: '本站是纯静态站点，没有服务器与数据库。你的反馈会通过「邮件」或「GitHub Issue」发送，资料只在你的浏览器里组装。' }),
    fieldRow('反馈类型', typeBox),
    fieldRow('资源名称', nameInput, false),
    fieldRow('资源链接', urlInput, false),
    fieldRow('详细描述', desc, true),
    fieldRow('联系方式', contact, false),
    hint,
    (function () {
      var row = U.el('div', { style: { display: 'flex', gap: '9px', flexWrap: 'wrap' } });

      function typeName() {
        return TYPES.filter(function (x) { return x.id === state.type; })[0].name;
      }
      function collect() {
        var lines = [
          '【反馈类型】' + typeName(),
          '【资源名称】' + (nameInput.value.trim() || '—'),
          '【资源链接】' + (urlInput.value.trim() || '—'),
          '【详细描述】' + (desc.value.trim() || '—'),
          '【联系方式】' + (contact.value.trim() || '—'),
          '【提交时间】' + new Date().toLocaleString('zh-CN'),
          '【页面地址】' + location.href
        ];
        return lines.join('\n');
      }
      function title() {
        return '[' + typeName() + '] ' + (nameInput.value.trim() || desc.value.trim().slice(0, 24) || '站点反馈');
      }

      var mail = U.el('button.btn.btn-primary', { type: 'button' }, [I.el('mail', { size: 15 }), U.el('span', { text: '用邮件发送' })]);
      mail.addEventListener('click', function () {
        if (!desc.value.trim()) { Ark.toast.show('请先填写详细描述', 'warn'); desc.focus(); return; }
        var href = 'mailto:' + (site.email || 'feedback@example.com') +
          '?subject=' + encodeURIComponent(title()) + '&body=' + encodeURIComponent(collect());
        location.href = href;
        Ark.toast.show('已唤起邮件客户端', 'mail');
      });

      var issue = U.el('button.btn.btn-soft', { type: 'button' }, [I.el('github', { size: 15 }), U.el('span', { text: '提交到 GitHub Issue' })]);
      issue.addEventListener('click', function () {
        if (!desc.value.trim()) { Ark.toast.show('请先填写详细描述', 'warn'); desc.focus(); return; }
        var repo = (site.repo || '').replace(/\/$/, '');
        if (!repo || repo.indexOf('github.com') === -1) {
          Ark.toast.show('尚未配置 GitHub 仓库地址', 'warn');
          return;
        }
        var u = repo + '/issues/new?title=' + encodeURIComponent(title()) + '&body=' + encodeURIComponent(collect());
        window.open(u, '_blank', 'noopener,noreferrer');
      });

      var copy = U.el('button.btn.btn-soft', { type: 'button' }, [I.el('copy', { size: 15 }), U.el('span', { text: '复制反馈内容' })]);
      copy.addEventListener('click', function () {
        U.copy(collect()).then(function () { Ark.toast.show('反馈内容已复制，可粘贴到任意渠道', 'copy'); })
          .catch(function () { Ark.toast.show('复制失败，请手动选择文本', 'warn'); });
      });

      row.appendChild(mail); row.appendChild(issue); row.appendChild(copy);
      return row;
    })()
  ]);

  /* ---------------------------------------------------- 第三方表单嵌入 */
  var embedHost = U.el('div');
  if (site.feedbackEmbedUrl) {
    embedHost.appendChild(U.el('div.panel.panel-pad', {}, [
      U.el('h3', { text: '在线表单' }),
      U.el('p.sm.muted', { style: { marginTop: '6px', marginBottom: '14px' }, text: '由第三方表单服务承载，提交内容直达收集后台，无需本站任何后端。' }),
      U.el('div.embed-box', {}, U.el('iframe', {
        src: site.feedbackEmbedUrl, loading: 'lazy', title: '在线反馈表单'
      }))
    ]));
  } else {
    embedHost.appendChild(U.el('div.panel.panel-pad', {}, [
      U.el('h3', { text: '接入第三方表单（可选）' }),
      U.el('p.sm.muted', { style: { marginTop: '6px' }, text: '如果你希望收集结构化的反馈数据，只需要在 data/site.json 里填一个地址，页面会自动把它嵌进来，无需改动任何代码：' }),
      U.el('pre.tree', { style: { marginTop: '12px' }, text: [
        '{',
        '  "feedbackEmbedUrl": "https://wj.qq.com/你的问卷地址"',
        '}'
      ].join('\n') }),
      U.el('p.sm.muted', { style: { marginTop: '12px' },
        text: '腾讯问卷、金数据、麦客、Formspree、GitHub Discussions 等都可以直接嵌入。' })
    ]));
  }

  /* ---------------------------------------------------- 页面组装 */
  content.appendChild(U.el('section.wrap', { style: { paddingTop: '18px' } }, [
    U.el('div.detail-head.reveal', {}, [
      U.el('h1', { text: '反馈与建议' }),
      U.el('p.muted', { style: { marginTop: '8px', maxWidth: '760px' },
        text: '发现死链、描述有误，或者有更好的站点想推荐？都可以告诉我们。每一条反馈都会在下一版更新日志里得到回应。' })
    ])
  ]));

  var sec = U.el('section.sec.wrap');
  sec.appendChild(U.el('div.fb-grid', {}, [form, embedHost]));
  sec.appendChild(U.el('div.panel.panel-pad', { style: { marginTop: '22px' } }, [
    U.el('h3', { text: '反馈处理说明' }),
    U.el('ul.prose.sm', { style: { marginTop: '10px' } }, [
      U.el('li', { text: '死链反馈：确认失效后会从资源库移除，并在更新日志的「移除」列表中公示。' }),
      U.el('li', { text: '信息纠错：核对官方站点后更新名称 / 描述 / 标签 / 分类。' }),
      U.el('li', { text: '资源推荐：会人工访问确认可用性与内容质量，通过后按分类入库。' }),
      U.el('li', { text: '本站不收录盗版资源、破解软件、成人内容与任何违法违规站点，此类推荐请勿提交。' })
    ])
  ]));
  content.appendChild(sec);

  Ark.lazy.scan(content);
};
