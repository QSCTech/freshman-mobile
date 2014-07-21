/**
 * @overview Freshman's Guidebook of Zhejiang University. 
 * @author Senorsen <sen@senorsen.com>
 * @copyright Qiu Shi Chao
 */

var Doc = function(md) {
    var that = this, html = markdown.toHTML(md);
    // 匹配子标题，与电脑版略有不同请注意。
    html = html.replace(/<h2>(.*)——(.*) (.*)<\/h2>/g, "<h2>$1</h2><div class=\"subtitle\">$2<br>$3</div>");
    html = html.replace(/<p>@@[ ]*([^<]+)<\/p>/g, '<div class="hide-element"><div class="hide-element-title">$1</div><div class="hide-element-content">');
    html = html.replace(/<p>@@<\/p>/g, '</div></div>');
    html = html.replace(/\\n/g, '<br>'); // 替换 \n 为 <br>
    html = html.replace(/<p>[ ]+/, '<p>'); // 去除 <p> 标签开头的空白
    html = html.replace(/<p>(<img alt="cover".*>)<\/p>/g, '$1'); 
    // 对图片的预处理，不一次全部加载完毕，希望用户不是用流量。
    // 另外先行隐藏，等适当时机（依次preload而后部分lazyload再显示、赋src）
    html = html.replace(/(<img.*?) src=/g, '$1 style="display: none" data-src=');
    var $html = $(html);
    $html.find('img[alt=cover]').addClass('img-cover');
    window.$html = $html;
    $html.find('h1, h2').addClass('title-in-content');
    this.$content = $('#content').html($html);
    var index = $html.clone().filter('h1, h2');
    index.removeClass('title-in-content').addClass('title-in-index');
    $('#cover-btn').html(index);
    this.pages = {
        cover: $('#cover'),
        content: $('#content'),
        downloads: $('#downloads'),
        search: $('#serach')
    };
    this.positionTable = [];
    this.nameTable = [];
    this.initFunc();
    this.parseSections();
    // tap or click
    this.bindLinkKeys();
    window.onscroll = function() {
        // 需不需要二分法捏。。。
        // 虽然似乎不太需要，不过好久没写了……写一个吧～
        var currentTop = document.body.scrollTop,
            currentTitle = '',
            currentTitleID = -1;
        var binFind = function(a, n, f) {
            var left, right, mid;
            left = 0;
            right = n;
            mid = right / 2;
            while (left <= mid && right >= mid) {
console.log(mid);
console.log(a[mid]);
                if (f == a[mid] || (f > a[mid] && f < a[mid+1])) {
                    return mid;
                } else if (f < a[mid]) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
                mid = (left + right) / 2;
            }
            return -1;
        };
        currentTitleID = binFind(that.positionTable, that.positionTable.length, currentTop);
        if (currentTitleID == -1 || typeof that.nameTable[currentTitleID] == 'undefined') return;
        that.updateTitle(that.nameTable[currentTitleID]);
        that.updateUrl($('.title-' + that.nameTable[currentTitleID]).attr('data-url'));
    };
};
Doc.prototype.initFunc = function() {
    var that = this;

    this.getElementTitle = function(ele) {
        return $(ele).text().trim(); // 去除两边的空格
    };
    this.parseSections = function() {
        var titleObject = $('h1, h2'), 
            lastChapter = '';
        for (var i = 0; i < titleObject.length; i++) {
            if ($(titleObject[i]).attr('tagName').toLowerCase() == 'h1') {
                // 大章节标题
                lastChapter = that.getElementTitle(titleObject[i]);
                $(titleObject[i]).attr('data-url', '#!/' + lastChapter);
            } else {
                // 必为小节
                $(titleObject[i]).attr('data-chapter', lastChapter)
                                 .attr('data-url', '#!/' + lastChapter + '/' + that.getElementTitle(titleObject[i]));
            }
            $(titleObject[i]).attr('data-title', that.getElementTitle(titleObject[i]))
                             .addClass('title-' + that.getElementTitle(titleObject[i]));
            that.positionTable.push($(titleObject[i]).offset().top);
            that.nameTable.push(that.getElementTitle(titleObject[i]));
            console.log('[' + that.getElementTitle(titleObject[i]) + '] -> ' + $(titleObject[i]).offset().top);
        }
    };
    this.bindLinkKeys = function() {
        var h1callback = function() {
            var url = '#!/' + that.getElementTitle(this);
            that.updateUrl(url);
            that.applyUrl(url);
        };
        var h2callback = function() {
            var url = '#!/' + $(this).attr('data-chapter') + '/' + that.getElementTitle(this);
            that.updateUrl(url);
            that.applyUrl(url);
        };
        var eventFunc = 'click';
        if (window.supportsTouch) {
            eventFunc = 'tap';
        }
        $('h1')[eventFunc](h1callback);
        $('h2')[eventFunc](h2callback);
    };
    this.updateUrl = function(url) {
        url = location.href.split('#!/')[0] + url;
        window.history.pushState(document.title, document.title, url);
    };
    this.applyUrl = function(url) {
        if (!url) {
            url = decodeURIComponent(window.location.href);
        }
        if (!/[#][!]\//.test(url)) return;
        var path = url.split('#!/');
        path = path.pop().split('/');
        that.applyPath(path);
    };
    this.applyPath = function(path) {
        // 一共可能有三层path，分为chapter / section / subsection
        if (console && console.log) {
            console.log(path);
        }
        if (path[0]) {
            if (path[0] == '下载') {
                that.switchPage('downloads');
            } else if (path[0] == '搜索') {
                that.switchPage('search');
            } else {
                that.switchPage('content');
                that.switchChapter(path[0]);
                if (path[1]) {
                    that.switchSection(path[1]);
                }
                if (path[2]) {
                    that.switchSubsection(path[3]);
                }
            }
        }
    };
    this.updateTitle = function(title) {
        document.title = '浙江大学新生手册移动版 - ' + title;
        
    };
    this.topOffset = 60;
    this.currentPage = 'cover';
    this.switchPage = function(page, gesture) {
        // gesture 用于判断是否为用户滑动。如果是，那么将采用其他动画。
        that.currentPage = page;
        scroll(0, -that.topOffset + that.pages[page].offset().top);
    };
    this.switchChapter = function(title, gesture) {
        scroll(0, -that.topOffset + that.pages[that.currentPage].find('h1.title-' + title).offset().top);
    };
    this.switchSection = function(title) {
        scroll(0, -that.topOffset + that.pages[that.currentPage].find('h2.title-' + title).offset().top);
    };
    this.switchSubsection = function(title) {
        $('h3').each(function() {
            if (that.getElementTitle(this) == title) {
                scroll(0, -that.topOffset + $(this).offset().top);
            }
        });
    };
};

$(document).ready(function() {
    $.get('share/freshman.md', function(data) {
        doc = new Doc(data);
        // 打开的时候非常有可能带hash，所以检测一下
        doc.applyUrl();
    }, 'text');

    // 劫持链接点击
    // [ATTENTION] window.open() will not open in new tab if it is not happening on actual click event. In the example given the url is being opened on actual click event.
    $('body').on('click', 'a', function(e) {
        var href = $(this).attr('href');
        if (!href) return;
        e.preventDefault();
        e.stopPropagation();
        var regexp = '/' + location.href.split('#!/')[0].replace('/', '\\/') + '/';
        if (eval(regexp).test(href)) {
            // 内部章节跳转
            // as like #!/入校 or #!/入校/懂得浙大 or #!/入校/懂得浙大/两大学院三大学园
            doc.applyUrl(href);
        } else {
            // 新窗口中打开其他链接
            window.open(href, '_blank');
        }
    });

    window.onhashchange = function() {
        console.log('hashchange');
        doc.applyUrl();
    };

    // Device Orientation Test
    // 测试表明，gamma为左右翻转手机，beta为上下翻转。
    $('#orientation-test').css('display', 'none');
    window.addEventListener('deviceorientation', function(event) {
        $('#event-alpha').text(event.alpha);
        $('#event-beta').text(event.beta);
        $('#event-gamma').text(event.gamma);
    }, true);
});

