import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isJSXElement, isJSXElementArray, isNumeric, mergeClassNames, random, range, toNumeric, } from './utils';
import styles from './index.module.scss';
import Slot from './components/Slot';
import { SlotCounterRef, StartAnimationOptions, Value } from './types/common';

interface Props {
  value: Value;
  startValue?: Value;
  duration?: number;
  dummyCharacters?: string[] | JSX.Element[];
  dummyCharacterCount?: number;
  autoAnimationStart?: boolean;
  containerClassName?: string;
  charClassName?: string;
  separatorClassName?: string;
  animateUnchanged?: boolean;
  hasInfiniteList?: boolean;
  valueClassName?: string;
  sequentialAnimationMode?: boolean;
  useMonospaceWidth?: boolean;
}

const SEPARATOR = [',', '.', ' '];

function SlotCounter(
  {
    value,
    startValue,
    duration = 0.7,
    dummyCharacters,
    dummyCharacterCount = 6,
    autoAnimationStart = true,
    containerClassName,
    charClassName,
    separatorClassName,
    animateUnchanged = false,
    hasInfiniteList = false,
    valueClassName,
    sequentialAnimationMode = false,
    useMonospaceWidth = false,
  }: Props,
  ref: React.Ref<SlotCounterRef>,
) {
  const serializedValue = useMemo(
    () => (isJSXElementArray(value) ? '' : JSON.stringify(value)),
    [value],
  );
  const [active, setActive] = useState(false);
  const startAnimationOptionsRef = useRef<StartAnimationOptions>();
  const numbersRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const prevValueRef = useRef<Props['value']>();

  const effectiveDummyCharacterCount =
    startAnimationOptionsRef.current?.dummyCharacterCount ??
    dummyCharacterCount;
  const effectiveDuration =
    startAnimationOptionsRef.current?.duration ?? duration;

  const dummyList = useMemo(
    () =>
      range(0, effectiveDummyCharacterCount - 1).map((i) => {
        if (!dummyCharacters) return random(0, 10);

        const index =
          i >= dummyCharacters.length ? random(0, dummyCharacters.length) : i;
        return dummyCharacters[index];
      }),
    [dummyCharacters, effectiveDummyCharacterCount],
  );

  useMemo(() => {
    if (valueRef.current === value) return;
    prevValueRef.current = valueRef.current;
    valueRef.current = value;
  }, [value]);

  const prevValueRefList = Array.isArray(prevValueRef.current)
    ? prevValueRef.current
    : prevValueRef.current?.toString().split('') ?? [];
  const valueRefList = Array.isArray(valueRef.current)
    ? valueRef.current
    : valueRef.current?.toString().split('') ?? [];

  const valueList = useMemo(
    () => (Array.isArray(value) ? value : value.toString().split('')),
    [value],
  );
  const startValueList = useMemo(
    () =>
      Array.isArray(startValue) ? startValue : startValue?.toString().split(''),
    [startValue],
  );

  const isChangedValueLength = prevValueRefList.length !== valueRefList.length;
  const isChangedValueIndexList: number[] = [];
  valueRefList.forEach((v, i) => {
    const targetIndex = valueRefList.length - i - 1;
    if (
      valueRefList[targetIndex] !== prevValueRefList[targetIndex] ||
      isChangedValueLength ||
      animateUnchanged
    ) {
      isChangedValueIndexList.push(targetIndex);
    }
  });
  isChangedValueIndexList.reverse();

  const calculatedInterval = useMemo(() => {
    const MAX_INTERVAL = 0.1;
    return Math.min(MAX_INTERVAL, effectiveDuration / valueList.length);
  }, [effectiveDuration, valueList.length]);

  const startAnimation = useCallback(() => {
    setActive(false);
    setTimeout(() => setActive(true), 20);
  }, []);

  const startAnimationAll = useCallback(
    (options?: StartAnimationOptions) => {
      prevValueRef.current = undefined;
      startAnimationOptionsRef.current = options;
      startAnimation();
    },
    [startAnimation],
  );

  const getSequentialDummyListByDigit = useCallback(
    (digit: number) => {
      const prevValue = prevValueRef.current;
      if (prevValue == null || !isNumeric(prevValue) || !isNumeric(value)) {
        return [];
      }

      const prevNumValue = Number(toNumeric(prevValue));
      const numValue = Number(toNumeric(value));
      const divider = 10 ** (digit - 1);

      const dummyList =
        prevNumValue < numValue
          ? range(
              Math.floor(prevNumValue / divider) + 1,
              Math.floor(numValue / divider),
            )
          : range(
              Math.floor(numValue / divider) + 1,
              Math.floor(prevNumValue / divider),
            );

      return Array.from(
        new Set(dummyList.map((v) => v.toString()[v.toString().length - 1])),
      ).filter(Boolean);
    },
    [value],
  );

  useEffect(() => {
    if (!autoAnimationStart) return;
    startAnimation();
  }, [autoAnimationStart, serializedValue, startAnimation]);

  useImperativeHandle(ref, () => ({
    startAnimation: startAnimationAll,
  }));

  return (
    <div className={mergeClassNames(containerClassName, styles.slot_wrap)}>
      {valueList.map((v, i) => {
        const isChanged = isChangedValueIndexList.includes(i);
        const delay =
          (isChanged ? isChangedValueIndexList.indexOf(i) : 0) *
          calculatedInterval;
        const prevValue = prevValueRef.current;
        const isDecrease =
          value != null &&
          prevValue != null &&
          isNumeric(value) &&
          isNumeric(prevValue) &&
          toNumeric(value) < toNumeric(prevValue);
        const reverseAnimation =
          startAnimationOptionsRef.current?.direction === 'top-down' ||
          isDecrease;

        if (!isJSXElement(v) && SEPARATOR.includes(v)) {
          return (
            <div
              key={valueRefList.length - i - 1}
              className={mergeClassNames(styles.separator, separatorClassName)}
            >
              {v}
            </div>
          );
        }

        return (
          <Slot
            key={valueRefList.length - i - 1}
            numbersRef={numbersRef}
            active={active}
            isChanged={isChanged}
            charClassName={charClassName}
            effectiveDuration={effectiveDuration}
            delay={delay}
            value={v}
            startValue={startValueList?.[i]}
            dummyList={
              sequentialAnimationMode
                ? getSequentialDummyListByDigit(valueList.length - i)
                : dummyList
            }
            hasInfiniteList={hasInfiniteList}
            valueClassName={valueClassName}
            reverse={reverseAnimation}
            sequentialAnimationMode={sequentialAnimationMode}
            useMonospaceWidth={useMonospaceWidth}
          />
        );
      })}
    </div>
  );
}

export default memo(forwardRef(SlotCounter));
export type { SlotCounterRef, StartAnimationOptions };
