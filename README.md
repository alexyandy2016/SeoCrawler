#SeoCrawler

SeoCrawler 是为了优化整站主要使用 AJAX 技术的项目所开发的一个工具。

不同于搜索引擎蜘蛛，SeoCrawler 的爬虫可以执行该页面上的 JS 脚本，并将执行完毕的页面抓取到本地。

使用 SeoCrawler 的项目可以反向代理工具所提供的 API，当搜索引擎的蜘蛛进入项目来抓取页面时，将看到的是 SeoCrawler 抓取到的已执行 JS 后的页面，而普通用户进入时所看到的还是原来的页面。

因此，使用 SeoCrawler 的项目不仅可以保证顺畅的使用 AJAX 技术来开发页面，也不用担心使用 AJAX 技术后造成的 SEO 问题，即搜索引擎无法抓取到 AJAX 数据的问题，大大的节省了开发人员维护 SEO 的成本。

架构 & 流程
1、后台多线程抓取页面脚本程序
2、前台提供反代的页面缓存 API
3、后台管理页面 dashboard

首先在后台配置第一个 APP（ID:1）需要抓取页面的域名，然后启动抓取脚本，即
   ```
   node crawler/appexec.js
   ```
此脚本使用 nodejs 编写，可实现多线程抓取，目前写死为每个 APP 分配 3 个线程。
在抓取方面使用了 CasperJs + PhantomJs 来抓取，PhantomJs 主要提供抓取服务，CasperJs 提供多样化 API。
   ```
   抓取逻辑代码在 /crawler/casper/test.js 内
   ```
抓取脚本会将 抓取地址、缓存页面文件路径、超时时间 传给 CasperJs 脚本，每个页面抓取都会分配一个 CasperJs 进程来执行，进程间没有冲突。
*为何不直接使用 PhantomJs 的 API？*
目前很多站点采用瀑布流形式，用户需要拉到浏览器底部才会触发加载数据，而 PhantomJs 提供的拉到底部 API 测试下来均无法实现，所以采用 CasperJs 的 API 来实现拉到底部，使得整个页面都可以加载出来，以便缓存。
页面抓取执行完毕后，可以通过访问 API 可以查看缓存的页面以及整个站点的 sitemap
首先启动 WEB 服务器
   ```
   node bin/www
   ```
然后访问此站点的 API，查看
   ```
   [页面缓存]：http://127.0.0.0:3000/api/1/[页面相对路径]
   [站点地图]：http://127.0.0.0:3000/api/1/sitemap.xml
   ```
也可以通过后台来查看抓取队列状态
    ```
    http://127.0.0.0:3000/dashboard/app/1-1
    ```
整个项目使用 Node.js + express 框架，实现了 restful 路由，Redis 作为数据库，请开启 Redis 的持久化哦。
 
 
目前项目部署在测试服务器192.168.1.93上，可通过http://192.168.1.93:3000/dashboard访问后台