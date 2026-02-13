# API令牌多分组选择功能 — 设计与修改方案

## 一、当前系统分析

### 1.1 数据模型（现状）

**Token 模型** — `model/token.go:14-32`

```go
type Token struct {
    // ...
    Group           string `json:"group" gorm:"default:''"`
    CrossGroupRetry bool   `json:"cross_group_retry"`
}
```

- `Group` 字段为 **单个字符串**，只能存储一个分组名
- 空字符串 `""` 表示使用用户自身的分组
- 特殊值 `"auto"` 表示自动分组（遍历系统配置的自动分组列表）

### 1.2 前端表单（现状）

**令牌编辑弹窗** — `web/src/components/table/tokens/modals/EditTokenModal.jsx:362-379`

```jsx
<Form.Select
  field='group'
  label={t('令牌分组')}
  optionList={groups}
  showClear
  style={{ width: '100%' }}
/>
```

- 使用 Semi Design 的 `Form.Select`，**单选模式**
- 分组列表从 `/api/user/self/groups` 接口加载
- 提交时 `group` 为单个字符串值

### 1.3 鉴权流程（现状）

**Auth 中间件** — `middleware/auth.go:325-342`

```go
userGroup := userCache.Group
tokenGroup := token.Group
if tokenGroup != "" {
    // 1. 检查 tokenGroup 是否在用户可用分组中
    if _, ok := service.GetUserUsableGroups(userGroup)[tokenGroup]; !ok {
        // 403 无权访问
    }
    // 2. 检查分组是否存在于 GroupRatio（auto 除外）
    if !ratio_setting.ContainsGroupRatio(tokenGroup) {
        if tokenGroup != "auto" {
            // 403 分组已弃用
        }
    }
    // 3. 覆盖 userGroup
    userGroup = tokenGroup
}
common.SetContextKey(c, constant.ContextKeyUsingGroup, userGroup)
```

- 只验证单个分组
- 将 `tokenGroup` 直接赋值给 `userGroup`

### 1.4 渠道分发（现状）

**Distributor 中间件** — `middleware/distributor.go:76-149`

- 使用 `ContextKeyUsingGroup`（单个分组）查找渠道
- 如果是 `"auto"` 分组，调用 `service.GetUserAutoGroup()` 获取分组列表，按顺序遍历

**渠道选择服务** — `service/channel_select.go:83-162`

- `"auto"` 分组的处理逻辑：遍历 `autoGroups` 列表，依次尝试每个分组
- 每个分组用完所有优先级后才切换到下一个分组
- 支持 `CrossGroupRetry`（跨分组重试）

### 1.5 关键参考：auto 分组的多分组遍历逻辑

`"auto"` 分组已经实现了多分组遍历的核心逻辑（`channel_select.go:89-154`），新功能可以复用这套机制。区别在于：

| 对比项 | auto 分组 | 多分组选择（新功能） |
|--------|----------|-------------------|
| 分组来源 | 系统配置的 `AutoGroups` | 用户在令牌中手动选择 |
| 分组顺序 | 系统配置顺序 | 用户选择顺序 |
| 存储方式 | `Group = "auto"` | `Group = "default,vip"` |

---

## 二、修改方案

### 2.1 总体思路

将 Token 的 `Group` 字段从存储单个分组名改为存储 **逗号分隔的多个分组名**，复用现有 `"auto"` 分组的遍历逻辑。

存储格式示例：
- `""` — 使用用户自身分组（不变）
- `"auto"` — 自动分组（不变）
- `"default"` — 单个分组（向后兼容）
- `"default,vip"` — 多分组，按顺序优先级：先 default，再 vip

### 2.2 数据库层修改

**文件：`model/token.go`**

无需修改字段类型，`Group` 仍为 `string`，用逗号分隔存储多个分组（与 `Channel.Group` 和 `Token.ModelLimits` 的存储方式一致）。

新增辅助方法：

```go
// GetGroups 获取令牌的分组列表
func (token *Token) GetGroups() []string {
    if token.Group == "" || token.Group == "auto" {
        return []string{token.Group}
    }
    return strings.Split(token.Group, ",")
}

// IsMultiGroup 判断是否为多分组令牌
func (token *Token) IsMultiGroup() bool {
    return token.Group != "" && token.Group != "auto" && strings.Contains(token.Group, ",")
}
```

数据库迁移：无需迁移，`Group` 字段类型不变。现有数据完全兼容。

### 2.3 前端修改

**文件：`web/src/components/table/tokens/modals/EditTokenModal.jsx`**

#### 2.3.1 Form.Select 改为多选

```jsx
<Form.Select
  field='group'
  label={t('令牌分组')}
  placeholder={t('令牌分组，默认为用户的分组')}
  optionList={groups}
  renderOptionItem={renderGroupOption}
  multiple                    // 开启多选
  showClear
  style={{ width: '100%' }}
/>
```

#### 2.3.2 提交时将数组转为逗号分隔字符串

在表单提交处理中，将 `group` 从数组转为字符串：

```js
// 提交前处理
if (Array.isArray(values.group)) {
  values.group = values.group.join(',');
}
```

#### 2.3.3 编辑时将字符串还原为数组

在 `loadToken` 函数中（约第 152 行），加载令牌数据后：

```js
if (data.group && data.group !== 'auto' && data.group.includes(',')) {
  data.group = data.group.split(',');
}
```

#### 2.3.4 跨分组重试的显示条件

当前仅 `group === 'auto'` 时显示跨分组重试开关。多分组时也应显示：

```jsx
// 原来：values.group === 'auto'
// 改为：
const showCrossGroupRetry = values.group === 'auto'
  || (Array.isArray(values.group) && values.group.length > 1);
```

### 2.4 后端 Controller 修改

**文件：`controller/token.go`**

#### 2.4.1 AddToken（第 140 行）和 UpdateToken（第 225 行）

在保存前增加分组验证逻辑：

```go
// 验证多分组中的每个分组是否合法
func validateTokenGroups(userId int, groupStr string) error {
    if groupStr == "" || groupStr == "auto" {
        return nil
    }
    groups := strings.Split(groupStr, ",")
    // 去重检查
    seen := make(map[string]bool)
    for _, g := range groups {
        g = strings.TrimSpace(g)
        if g == "" {
            return fmt.Errorf("分组名不能为空")
        }
        if seen[g] {
            return fmt.Errorf("分组 %s 重复", g)
        }
        seen[g] = true
    }
    return nil
}
```

在 `AddToken` 和 `UpdateToken` 中调用此验证。

### 2.5 Auth 中间件修改

**文件：`middleware/auth.go:325-342`**

这是最关键的修改。需要将单分组验证改为多分组验证：

```go
userGroup := userCache.Group
tokenGroup := token.Group
if tokenGroup != "" {
    if tokenGroup == "auto" {
        // auto 逻辑不变
        if _, ok := service.GetUserUsableGroups(userGroup)[tokenGroup]; !ok {
            abortWithOpenAiMessage(c, http.StatusForbidden, ...)
            return
        }
        userGroup = tokenGroup
    } else {
        // 多分组验证：检查每个分组是否都在用户可用分组中
        tokenGroups := strings.Split(tokenGroup, ",")
        usableGroups := service.GetUserUsableGroups(userGroup)
        for _, tg := range tokenGroups {
            tg = strings.TrimSpace(tg)
            if _, ok := usableGroups[tg]; !ok {
                abortWithOpenAiMessage(c, http.StatusForbidden,
                    fmt.Sprintf("无权访问 %s 分组", tg))
                return
            }
            if !ratio_setting.ContainsGroupRatio(tg) {
                abortWithOpenAiMessage(c, http.StatusForbidden,
                    fmt.Sprintf("分组 %s 已被弃用", tg))
                return
            }
        }
        if len(tokenGroups) == 1 {
            // 单分组，行为不变
            userGroup = tokenGroups[0]
        } else {
            // 多分组，标记为特殊值，让 distributor 处理
            userGroup = tokenGroup  // 保留完整的逗号分隔字符串
        }
    }
}
common.SetContextKey(c, constant.ContextKeyUsingGroup, userGroup)
```

### 2.6 Distributor / 渠道选择修改

**文件：`service/channel_select.go`**

在 `CacheGetRandomSatisfiedChannel` 函数中，增加多分组处理分支。核心思路：**复用 auto 分组的遍历逻辑**。

```go
func CacheGetRandomSatisfiedChannel(param *RetryParam) (*model.Channel, string, error) {
    var channel *model.Channel
    var err error
    selectGroup := param.TokenGroup
    userGroup := common.GetContextKeyString(param.Ctx, constant.ContextKeyUserGroup)

    if param.TokenGroup == "auto" {
        // ... 现有 auto 逻辑不变 ...
    } else if strings.Contains(param.TokenGroup, ",") {
        // ===== 新增：多分组处理 =====
        // 逻辑与 auto 类似，但分组列表来自令牌配置
        multiGroups := strings.Split(param.TokenGroup, ",")

        startGroupIndex := 0
        crossGroupRetry := common.GetContextKeyBool(
            param.Ctx, constant.ContextKeyTokenCrossGroupRetry)

        if lastGroupIndex, exists := common.GetContextKey(
            param.Ctx, constant.ContextKeyAutoGroupIndex); exists {
            if idx, ok := lastGroupIndex.(int); ok {
                startGroupIndex = idx
            }
        }

        for i := startGroupIndex; i < len(multiGroups); i++ {
            group := strings.TrimSpace(multiGroups[i])
            priorityRetry := param.GetRetry()
            if i > startGroupIndex {
                priorityRetry = 0
            }

            channel, _ = model.GetRandomSatisfiedChannel(
                group, param.ModelName, priorityRetry)
            if channel == nil {
                common.SetContextKey(param.Ctx,
                    constant.ContextKeyAutoGroupIndex, i+1)
                param.SetRetry(0)
                continue
            }
            common.SetContextKey(param.Ctx,
                constant.ContextKeyAutoGroup, group)
            selectGroup = group

            if crossGroupRetry && priorityRetry >= common.RetryTimes {
                common.SetContextKey(param.Ctx,
                    constant.ContextKeyAutoGroupIndex, i+1)
                param.SetRetry(0)
                param.ResetRetryNextTry()
            } else {
                common.SetContextKey(param.Ctx,
                    constant.ContextKeyAutoGroupIndex, i)
            }
            break
        }
    } else {
        // 单分组，逻辑不变
        channel, err = model.GetRandomSatisfiedChannel(
            param.TokenGroup, param.ModelName, param.GetRetry())
        if err != nil {
            return nil, param.TokenGroup, err
        }
    }
    return channel, selectGroup, nil
}
```

### 2.7 Distributor 中间件适配

**文件：`middleware/distributor.go:101-122`**

channel affinity 部分也需要适配多分组。当 `usingGroup` 包含逗号时，需要遍历各分组检查 affinity：

```go
if strings.Contains(usingGroup, ",") {
    // 多分组 affinity 检查
    multiGroups := strings.Split(usingGroup, ",")
    for _, g := range multiGroups {
        g = strings.TrimSpace(g)
        if model.IsChannelEnabledForGroupModel(g, modelRequest.Model, preferred.Id) {
            selectGroup = g
            common.SetContextKey(c, constant.ContextKeyAutoGroup, g)
            channel = preferred
            service.MarkChannelAffinityUsed(c, g, preferred.Id)
            break
        }
    }
}
```

### 2.8 倍率计算适配

**文件：`relay/common/relay_info.go`**

在计算分组倍率时，需要使用实际选中的分组（`ContextKeyAutoGroup`），而非完整的逗号分隔字符串。检查 `relay_info.go` 中获取 `groupRatio` 的逻辑，确保多分组时使用的是最终选中的单个分组名。

---

## 三、修改文件清单

| 序号 | 文件路径 | 修改内容 |
|------|---------|---------|
| 1 | `model/token.go` | 新增 `GetGroups()`、`IsMultiGroup()` 方法 |
| 2 | `controller/token.go` | AddToken/UpdateToken 增加多分组验证 |
| 3 | `middleware/auth.go` | 多分组鉴权验证（第 325-342 行） |
| 4 | `middleware/distributor.go` | 多分组 affinity 检查（第 101-122 行） |
| 5 | `service/channel_select.go` | 新增多分组渠道选择分支 |
| 6 | `relay/common/relay_info.go` | 确保倍率计算使用实际选中的分组 |
| 7 | `web/src/components/table/tokens/modals/EditTokenModal.jsx` | Form.Select 改多选，数据格式转换 |

---

## 四、数据兼容性

| 现有数据 | 新逻辑下的行为 |
|---------|--------------|
| `Group = ""` | 使用用户自身分组（不变） |
| `Group = "auto"` | 自动分组（不变） |
| `Group = "default"` | 单分组（不变，`strings.Split` 返回单元素数组） |
| `Group = "default,vip"` | 新功能：按顺序遍历 default → vip |

无需数据库迁移，完全向后兼容。

---

## 五、用户使用示例

1. 用户创建令牌，在分组选择器中依次选择 `default`、`vip`
2. 前端提交 `group: "default,vip"`
3. 当使用该令牌调用模型时：
   - 系统先在 `default` 分组中查找该模型的可用渠道
   - 如果 `default` 分组有该模型 → 使用 default 分组的渠道，按 default 分组倍率计费
   - 如果 `default` 分组没有该模型 → 尝试 `vip` 分组
   - 如果 `vip` 分组有该模型 → 使用 vip 分组的渠道，按 vip 分组倍率计费
   - 如果都没有 → 返回错误
4. 开启「跨分组重试」后，default 分组渠道失败时会继续尝试 vip 分组的渠道
