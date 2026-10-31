# 下一批两个文章主题与关键词

日期：2026-11-01。此轮仅选题与关键词建议，不创建文章或公开URL。

依据：`outputs/seo-plan-2026-10-31/keyword-mapping.json`，源文件为2026-10-28 Semrush导出。已有五篇文章按当前 `src/lib/blog-posts.ts` 与旧找调文章核对。

本次尝试重新查询Semrush美国数据库的批量关键词指标与两个查询的自然结果，均返回上游HTTP403。下面的量/KD仅标注原导出值，不声称为今日最新数据。原表Top10用于历史意图参考，新扩展词尚未完成当前SERP重合度核查，不视为已验证的完整聚类。

## 优先1：音乐时间感练习

建议标题：**How to Improve Your Timing in Music: Practical Metronome Exercises**

规划URL：`/blogs/timing-in-music`，来自原G42/B11。

|关键词|来源|US月量（原表）|KD（原表）|建议作用|
|---|---|---:|---:|---|
|timing for music|原G42，源行254|110|8|保留原组主词，正文解释timing概念|
|song timing|原G42，源行255|40|43|弱辅助；有歧义，不作为标题主攻词|
|how to improve timing in music|新增建议|未核实|未核实|建议标题/主任务表达|
|how to improve rhythm and timing|新增建议|未核实|未核实|辅助主题表达|
|metronome exercises for beginners|新增建议|未核实|未核实|练习小节候选|
|how to practice with a metronome|新增建议|未核实|未核实|操作小节候选|
|how to stay on beat|新增建议|未核实|未核实|FAQ候选|
|how to stop rushing or dragging|新增建议|未核实|未核实|故障排查/FAQ候选|

意图：演奏/唱歌时维持稳定节拍；建议教程形态。原G42历史Top10混合百科、练习教程、节拍器与拍号解释，需要把正文主任务限定为时间感练习，不能认定整个宽泛查询都纯属教程。

内容：区别pulse/rhythm/tempo → 跟拍 → 每两拍听一次click → 留空小节再回归 → 录音自查抢拍/拖拍。具体练习用原创音频验证，不宣称现有网页节拍器已具备尚未实现的静音小节/复杂细分功能。可在文章制作独立示例；工具入口使用现有节拍器与Tap Tempo。

去重：与DJ Beatmatching区别在于控制个人演奏/歌唱的时值，而非操作两首录音的rate/nudge。与Fast & Slow Tempo区别在于练习而非术语解释。`metronome`和`online metronome`的工具主意图仍留给真实节拍器，`time signature detector`不分配到本文。新增疑问词先作为小节/FAQ候选，不单独建页。

## 优先2：调性与音阶的区别

建议标题：**Key vs Scale: What’s the Difference in Music?**

规划URL：`/blogs/musical-key-and-scale`，来自原G30/B09。

|关键词|来源|US月量（原表）|KD（原表）|建议作用|
|---|---|---:|---:|---|
|key scale|原G30，源行212|390|29|保留原组词，正文自然表达，不机械塞标题|
|music key|原G30，源行213|720|41|宽泛辅助词，不承诺全词意图由本文承接|
|key vs scale|新增建议|未核实|未核实|建议标题/主任务表达|
|difference between key and scale|新增建议|未核实|未核实|同一任务的辅助表达|
|what is a key in music|新增建议|未核实|未核实|概念小节候选|
|what is a scale in music|新增建议|未核实|未核实|概念小节候选|
|can a song use notes outside its key|新增建议|未核实|未核实|FAQ候选|
|why do C major and A minor have the same notes|新增建议|未核实|未核实|原创试听示例/FAQ候选|

意图：理解音阶的排列/音程模式与调性的主音组织。原G30历史Top10有Ableton概念课、Scales & Keys教程，也混入音阶工具、调号资料和论坛，因此保留概念教程的任务边界，不能称整个主词当前SERP都是教程。

内容：音阶/调性定义 → 同样音集合不同中心的原创对比 → 相同主音但大小调不同 → 调性之外的音为什么可以出现 → 与检测结果的联系。证据可从Ableton Keys and scales/Minor scales、Puget Sound Major/Minor Key Signatures继续核查。需要独立例子，避免把旧文章的关系大小调段落扩写成重复全文。

去重：已有Key Notation主攻标签、升降号、调号与读谱，不再在本文重做15调号表；已有How to Find the Key主攻判断流程，不在本文重复上传和找调四步骤。`key finder`继续由首页承接，`scale finder`/`key finder from chords`不由纯概念文章冒充输入工具。

## 发布规则

- 两个主题各一个页面；上述新增扩展词只是同页覆盖候选，不是逐词建页清单。
- 当前不合计各词搜索量，不把原表Volume理解为页面预期流量。
- 正式写作前，用目标读者地区的当前SERP再复核拟定标题词和关键扩展词；若与已有页高重合，优先补已有文章，而不是坚持新URL。
- 不发布空页；完成例子、来源和正文后再加入Blogs、相关文章和sitemap。
