"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Edit3, Eye, RotateCcw, Check, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

interface ParagraphRevisionProps {
  paragraph: string;
  index: number;
  onRevise: (index: number, newText: string) => void;
  isRevising?: boolean;
  isHighlighted?: boolean;
  onHighlightChange?: (shouldHighlight: boolean) => void;
  onStartRevision?: (params: any, index: number) => Promise<string>;
}

const STYLE_OPTIONS = [
  { value: 'concise', label: '更精炼', labelEn: 'Concise' },
  { value: 'formal', label: '更正式', labelEn: 'Formal' },
  { value: 'logical', label: '更有逻辑', labelEn: 'Logical' },
  { value: 'emotional', label: '更感性', labelEn: 'Emotional' },
  { value: 'persuasive', label: '更有说服力', labelEn: 'Persuasive' },
  { value: 'academic', label: '更学术', labelEn: 'Academic' },
  { value: 'approachable', label: '更亲切', labelEn: 'Approachable' },
  { value: 'humanized', label: '更人性化', labelEn: 'Humanized' },
  { value: 'clarity', label: '更清晰', labelEn: 'Clarity' },
];

export default function ParagraphRevision({
  paragraph,
  index,
  onRevise,
  isRevising = false,
  isHighlighted = false,
  onHighlightChange,
  onStartRevision
}: ParagraphRevisionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [wordControl, setWordControl] = useState<'keep' | 'expand' | 'reduce'>('keep');
  const [targetWordCount, setTargetWordCount] = useState<string>('');
  const [direction, setDirection] = useState('');
  const [isLocalRevising, setIsLocalRevising] = useState(false);
  
  // 修改后的内容状态
  const [revisedText, setRevisedText] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState(paragraph);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (revisedText === null) {
      setOriginalText(paragraph);
    }
  }, [paragraph, revisedText]);

  const currentWordCount = paragraph.length;

  const handleStyleToggle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter(s => s !== style));
    } else {
      if (selectedStyles.length < 2) {
        setSelectedStyles([...selectedStyles, style]);
      }
    }
  };

  const handleStartRevision = async () => {
    if (selectedStyles.length === 0) return;
    
    onHighlightChange?.(false);
    setShowRevisionDialog(false);
    
    // 准备 API 参数
    // 将选中的风格值转换为中文标签
    const styleLabels = selectedStyles.map(styleValue => {
      const option = STYLE_OPTIONS.find(opt => opt.value === styleValue);
      return option ? option.label : styleValue;
    });
    
    const params = {
      revise_type: (wordControl === 'keep' ? 0 : (wordControl === 'expand' ? 1 : 2)).toString(), // 转换为字符串
      style: styleLabels.join(';'), // 使用分号拼接中文标签
      original_word_count: paragraph.length.toString(), // 转换为字符串
      word_count: targetWordCount || paragraph.length.toString(),
      detail: direction,
      original_context: paragraph,
      whole: '1' // 段落重写，转换为字符串
    };
    
    setIsLocalRevising(true);
    try {
      if (onStartRevision) {
        const result = await onStartRevision(params, index);
        setRevisedText(result);
      } else {
        // 如果没有提供 API 函数，使用模拟
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRevisedText(paragraph + " [已修改版本]");
      }
    } catch (error) {
      console.error('Revision failed:', error);
    } finally {
      setIsLocalRevising(false);
    }
  };

  const handleConfirmRevision = () => {
    if (revisedText) {
      onRevise(index, revisedText);
      setRevisedText(null);
    }
  };

  const handleRevertRevision = () => {
    setRevisedText(null);
    onRevise(index, originalText);
  };

  return (
    <div
      className={`group relative transition-all duration-200 ${
        isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 rounded px-2 py-1 -mx-2 -my-1' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 段落内容 */}
      <div className="relative min-h-[2rem]">
        {isLocalRevising || isRevising ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">正在重写段落...</span>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words pr-24">
            {showOriginal && revisedText ? originalText : (revisedText || paragraph)}
          </div>
        )}
        
        {/* 重写按钮 - 固定在段落右上角 */}
        {!revisedText && (
          <Button
            size="sm"
            variant="ghost"
            className={`absolute top-0 right-0 transition-all duration-200 shadow-sm bg-background/95 hover:bg-background border text-xs ${
              isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => {
              setShowRevisionDialog(true);
              onHighlightChange?.(true);
            }}
          >
            <Edit3 className="w-3 h-3 mr-1" />
            重写
          </Button>
        )}
        
        {/* Popover弹窗 - 使用portal渲染，避免干扰hover */}
        {!revisedText && (
          <Popover open={showRevisionDialog} onOpenChange={(open) => {
            setShowRevisionDialog(open);
            onHighlightChange?.(open);
          }}>
            <PopoverTrigger asChild>
              <span />
            </PopoverTrigger>
          <PopoverContent className="w-96 p-4" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">段落重写设置</h4>
              
              {/* 风格选择（限2个） */}
              <div>
                <Label className="text-sm mb-2 block">选择风格（最多2个）</Label>
                <div className="grid grid-cols-3 gap-1">
                  {STYLE_OPTIONS.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => handleStyleToggle(style.value)}
                      className={`p-2 rounded text-xs transition-all ${
                        selectedStyles.includes(style.value)
                          ? 'border-primary bg-primary/10 text-primary font-medium border'
                          : 'border-muted hover:border-muted-foreground/30 border'
                      } ${selectedStyles.length >= 2 && !selectedStyles.includes(style.value) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={selectedStyles.length >= 2 && !selectedStyles.includes(style.value)}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 字数控制 */}
              <div>
                <Label className="text-sm mb-2 block">字数控制</Label>
                <RadioGroup value={wordControl} onValueChange={(value: any) => setWordControl(value)}>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <RadioGroupItem value="keep" />
                      <span className="text-xs">保持原长度</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <RadioGroupItem value="expand" />
                      <span className="text-xs">扩写</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <RadioGroupItem value="reduce" />
                      <span className="text-xs">缩写</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* 补充方向 */}
              <div>
                <Label className="text-sm mb-2 block">补充修改方向（150字内）</Label>
                <Textarea
                  value={direction}
                  onChange={(e) => setDirection(e.target.value.slice(0, 150))}
                  placeholder="例如：更详细说明成果"
                  className="min-h-[60px] text-sm bg-white dark:bg-white"
                  maxLength={150}
                />
                <span className="text-xs text-muted-foreground float-right mt-1">
                  {direction.length}/150
                </span>
              </div>

              <Button
                onClick={handleStartRevision}
                disabled={selectedStyles.length === 0}
                className="w-full"
                size="sm"
              >
                开始重写
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        )}
      </div>

      {/* 修改后的操作按钮 */}
      {revisedText && (
        <div className="mt-3 flex items-center gap-2 bg-primary/5 p-3 rounded-lg border border-primary/20">
          <Badge variant="secondary" className="text-xs">
            段落已修改
          </Badge>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            <Eye className="w-4 h-4 mr-1" />
            {showOriginal ? '查看修改' : '查看原文'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRevertRevision}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            撤销
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmRevision}
          >
            <Check className="w-4 h-4 mr-1" />
            确认
          </Button>
        </div>
      )}
    </div>
  );
}
