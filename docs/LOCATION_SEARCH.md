# 地图卡片的位置搜索

当前实现位于 `src/bento/editor/LocationSearch.tsx`，浏览器直接请求 OpenStreetMap Nominatim 的 `/search`；用户从结果中选择位置后，卡片保存经纬度与简短标签。`MapWidget` 负责地图展示，`WidgetEditOverlay` 提供编辑入口。

使用方式：进入编辑模式，添加或选择地图卡片，在卡片编辑界面打开位置搜索，输入地名并选择结果。输入有 500 ms 防抖；组件未配置 Google Maps API Key，也不使用仓库中任何旧 Google Maps 配置说明。

搜索需要浏览器能访问 `nominatim.openstreetmap.org`。若无结果，先检查浏览器网络请求与搜索词；第三方服务不可用时，搜索功能也会受影响。当前代码只有防抖，没有全局请求队列或严格的每秒请求次数保证；高频/公开使用前应评估服务方的使用规则，并考虑自建或替换搜索服务。
