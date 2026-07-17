# ChatInput — 对话输入框

## 职责

Claude 风格的完整对话输入组件。所有原子/分子/有机体的组装入口。

## 依赖链

```
ChatInput
├── PromptTextarea          (kui/molecules/)
└── InputToolbar            (kui/organisms/)
    ├── AttachButton        → IconButton → KuiButton
    ├── ModelSelector       → Button
    ├── VoiceButton         → IconButton → KuiButton
    └── SendButton          → Button
```

## Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `string` | - | 输入值 |
| `onValueChange` | `(value: string) => void` | - | 值变化回调 |
| `onSend` | `() => void` | - | 发送回调 |
| `placeholder` | `string` | 默认文案 | 占位文本 |
| `loading` | `boolean` | `false` | 加载中 |
| `disabled` | `boolean` | `false` | 禁用 |
| `maxLength` | `number` | `4000` | 最大字符数 |
| `model` / `models` / `onModelSelect` | - | - | 模型选择 |
| `recording` / `onVoiceToggle` | - | - | 语音 |

## 交互

- **Enter** 发送消息
- **Shift+Enter** 换行
- 输入为空时发送按钮灰色禁用态
- 有内容时发送按钮亮色可用

## 使用

```tsx
import { ChatInput } from '@/components/kui'
<ChatInput value={val} onValueChange={setVal} onSend={handleSend} />
```

## 开发

- 修改子组件时在 `pages/ComponentPreview` 预览
- 预览通过后提交
