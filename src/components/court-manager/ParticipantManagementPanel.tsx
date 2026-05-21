"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle, Plus, Trash2, UserPlus, X } from "lucide-react";
import Select from "@/components/Select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ParticipantManagementOption = {
  value: string;
  label: string;
};

export type ParticipantManagementDraft = {
  name: string;
  gender: string;
  ageGroup: string;
  grade: string;
};

export type ParticipantManagementItem = {
  id: string | number;
  name: string;
  genderLabel: string;
  ageLabel: string;
  gradeLabel?: string;
  gamesLabel?: string;
  winLossLabel?: string;
  isActive?: boolean;
  partner?: {
    id: string | number;
    name: string;
  } | null;
};

export type ParticipantManagementPanelProps = {
  participants: ParticipantManagementItem[];
  draft: ParticipantManagementDraft;
  genderOptions: ParticipantManagementOption[];
  ageOptions: ParticipantManagementOption[];
  compactAgeOptions?: ParticipantManagementOption[];
  gradeOptions: ParticipantManagementOption[];
  compactGradeOptions?: ParticipantManagementOption[];
  onDraftChange: (draft: Partial<ParticipantManagementDraft>) => void;
  onAddParticipant: (nameOverride?: string) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  errorText?: string;
  invalid?: boolean;
  addDisabledMessage?: string;
  addLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  listClassName?: string;
  highlightedParticipantId?: string | number | null;
  onHighlightSettled?: () => void;
  partnerSelectionSource?: ParticipantManagementItem | null;
  onCancelPartnerSelection?: () => void;
  onStartPartnerSelection?: (participantId: string | number) => void;
  onAssignPartner?: (participantId: string | number) => void;
  onClearPartner?: (participantId: string | number) => void;
  onRemoveParticipant?: (participantId: string | number) => void;
};

export function ParticipantManagementPanel({
  participants,
  draft,
  genderOptions,
  ageOptions,
  compactAgeOptions,
  gradeOptions,
  compactGradeOptions,
  onDraftChange,
  onAddParticipant,
  disabled = false,
  isSubmitting = false,
  errorText,
  invalid = false,
  addDisabledMessage,
  addLabel = "참가자 추가",
  emptyTitle = "아직 추가된 참가자가 없습니다",
  emptyDescription = "이름과 조건을 입력한 뒤 참가자를 추가하세요.",
  className,
  listClassName,
  highlightedParticipantId,
  onHighlightSettled,
  partnerSelectionSource,
  onCancelPartnerSelection,
  onStartPartnerSelection,
  onAssignPartner,
  onClearPartner,
  onRemoveParticipant,
}: ParticipantManagementPanelProps) {
  const isNameComposingRef = useRef(false);
  const submitAfterCompositionRef = useRef(false);
  const skipNextEnterRef = useRef(false);
  const mobileScrollBodyRef = useRef<HTMLDivElement | null>(null);
  const desktopScrollBodyRef = useRef<HTMLDivElement | null>(null);
  const mobileRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const desktopRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasPartnerActions = Boolean(
    onStartPartnerSelection || onAssignPartner || onClearPartner
  );
  const canRemove = Boolean(onRemoveParticipant);
  const compactAgeSelectOptions = compactAgeOptions ?? ageOptions;
  const compactGradeSelectOptions = compactGradeOptions ?? gradeOptions;

  useEffect(() => {
    if (highlightedParticipantId === null || highlightedParticipantId === undefined) {
      return;
    }

    const key = String(highlightedParticipantId);
    const mobileRowElement = mobileRowRefs.current[key];
    const desktopRowElement = desktopRowRefs.current[key];
    const rowElement =
      mobileRowElement?.offsetParent !== null
        ? mobileRowElement
        : desktopRowElement?.offsetParent !== null
          ? desktopRowElement
          : null;
    const containerElement =
      mobileRowElement?.offsetParent !== null
        ? mobileScrollBodyRef.current
        : desktopRowElement?.offsetParent !== null
          ? desktopScrollBodyRef.current
          : mobileScrollBodyRef.current;

    if (
      containerElement &&
      rowElement &&
      containerElement.scrollHeight > containerElement.clientHeight
    ) {
      const containerRect = containerElement.getBoundingClientRect();
      const rowRect = rowElement.getBoundingClientRect();
      const rowTop = rowRect.top - containerRect.top + containerElement.scrollTop;
      const rowBottom = rowTop + rowRect.height;
      const visibleTop = containerElement.scrollTop;
      const visibleBottom = visibleTop + containerElement.clientHeight;

      if (rowBottom > visibleBottom) {
        containerElement.scrollTo({
          top: rowBottom - containerElement.clientHeight,
        });
      } else if (rowTop < visibleTop) {
        containerElement.scrollTo({ top: rowTop });
      }
    }

    onHighlightSettled?.();
  }, [highlightedParticipantId, onHighlightSettled, participants.length]);

  const submitParticipant = (nameOverride?: string) => {
    if (disabled) {
      return;
    }

    onAddParticipant(nameOverride);
  };

  const handleNameCompositionStart = () => {
    isNameComposingRef.current = true;
    submitAfterCompositionRef.current = false;
    skipNextEnterRef.current = false;
  };

  const handleNameCompositionEnd = (value: string) => {
    isNameComposingRef.current = false;
    onDraftChange({ name: value });

    if (submitAfterCompositionRef.current) {
      submitAfterCompositionRef.current = false;
      skipNextEnterRef.current = true;
      requestAnimationFrame(() => {
        submitParticipant(value);
      });
    }
  };

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    if (skipNextEnterRef.current) {
      event.preventDefault();
      skipNextEnterRef.current = false;
      return;
    }

    const nativeEvent = event.nativeEvent as KeyboardEvent & {
      isComposing?: boolean;
      keyCode?: number;
    };
    const isComposing =
      isNameComposingRef.current ||
      nativeEvent.isComposing === true ||
      nativeEvent.keyCode === 229;

    event.preventDefault();

    if (isComposing) {
      submitAfterCompositionRef.current = true;
      return;
    }

    submitParticipant();
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      <div className="md:hidden">
        <ParticipantAddControls
          draft={draft}
          genderOptions={genderOptions}
          ageOptions={compactAgeSelectOptions}
          gradeOptions={compactGradeSelectOptions}
          disabled={disabled}
          invalid={invalid}
          isSubmitting={isSubmitting}
          addLabel={addLabel}
          compact
          onDraftChange={onDraftChange}
          onAddParticipant={submitParticipant}
          onNameCompositionStart={handleNameCompositionStart}
          onNameCompositionEnd={handleNameCompositionEnd}
          onNameKeyDown={handleNameKeyDown}
        />
      </div>

      <div className="hidden md:block">
        <ParticipantAddControls
          draft={draft}
          genderOptions={genderOptions}
          ageOptions={ageOptions}
          gradeOptions={gradeOptions}
          disabled={disabled}
          invalid={invalid}
          isSubmitting={isSubmitting}
          addLabel={addLabel}
          onDraftChange={onDraftChange}
          onAddParticipant={submitParticipant}
          onNameCompositionStart={handleNameCompositionStart}
          onNameCompositionEnd={handleNameCompositionEnd}
          onNameKeyDown={handleNameKeyDown}
        />
      </div>

      {addDisabledMessage ? (
        <p className="text-xs font-bold text-slate-400">{addDisabledMessage}</p>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden border-2 bg-white md:flex-none md:overflow-visible",
          invalid ? "border-red-300" : "border-slate-200",
          listClassName
        )}
      >
        {partnerSelectionSource ? (
          <div className="flex items-start justify-between gap-4 border-b-2 border-violet-200 bg-violet-50 px-3 py-3 md:px-4 md:py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700">
                파트너 선택 모드
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="border border-violet-200 bg-white px-2 py-1 text-xs font-bold text-slate-900">
                  {partnerSelectionSource.name}
                </span>
                <span className="truncate text-sm font-medium text-slate-700">
                  의 파트너를 선택하세요.
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="h-9 rounded-none border-2 border-violet-200 bg-white px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700 hover:border-violet-400 hover:bg-violet-100"
              onClick={onCancelPartnerSelection}
            >
              취소
            </Button>
          </div>
        ) : null}

        <div
          ref={mobileScrollBodyRef}
          className="wizard-scroll min-h-0 flex-1 md:hidden"
          tabIndex={0}
          role="region"
          aria-label="참가자 목록"
        >
          {participants.map((participant, index) => (
            <ParticipantMobileRow
              key={participant.id}
              participant={participant}
              index={index}
              disabled={disabled}
              hasPartnerActions={hasPartnerActions}
              isPartnerSource={partnerSelectionSource?.id === participant.id}
              isPartnerCandidate={
                partnerSelectionSource !== null &&
                partnerSelectionSource !== undefined &&
                partnerSelectionSource.id !== participant.id
              }
              canRemove={canRemove}
              onAssignPartner={onAssignPartner}
              onStartPartnerSelection={onStartPartnerSelection}
              onClearPartner={onClearPartner}
              onRemoveParticipant={onRemoveParticipant}
              rowRef={(element) => {
                mobileRowRefs.current[String(participant.id)] = element;
              }}
            />
          ))}
          {participants.length === 0 ? (
            <EmptyParticipantState title={emptyTitle} description={emptyDescription} />
          ) : null}
        </div>

        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <div
              className={cn(
                hasPartnerActions || canRemove
                  ? "min-w-[620px] lg:min-w-[760px]"
                  : "min-w-[560px]"
              )}
            >
              <ParticipantDesktopHeader
                hasPartnerActions={hasPartnerActions}
                canRemove={canRemove}
              />
              <div
                ref={desktopScrollBodyRef}
                className="wizard-scroll max-h-[min(26rem,42vh)] bg-white"
              >
                {participants.map((participant, index) => (
                  <ParticipantDesktopRow
                    key={participant.id}
                    participant={participant}
                    index={index}
                    disabled={disabled}
                    hasPartnerActions={hasPartnerActions}
                    isPartnerSource={partnerSelectionSource?.id === participant.id}
                    isPartnerCandidate={
                      partnerSelectionSource !== null &&
                      partnerSelectionSource !== undefined &&
                      partnerSelectionSource.id !== participant.id
                    }
                    canRemove={canRemove}
                    onAssignPartner={onAssignPartner}
                    onStartPartnerSelection={onStartPartnerSelection}
                    onClearPartner={onClearPartner}
                    onRemoveParticipant={onRemoveParticipant}
                    rowRef={(element) => {
                      desktopRowRefs.current[String(participant.id)] = element;
                    }}
                  />
                ))}
                {participants.length === 0 ? (
                  <EmptyParticipantState
                    title={emptyTitle}
                    description="참가자를 추가하면 이 목록에서 바로 확인할 수 있습니다."
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {errorText ? (
        <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
          {errorText}
        </div>
      ) : null}
    </div>
  );
}

function ParticipantAddControls({
  draft,
  genderOptions,
  ageOptions,
  gradeOptions,
  disabled,
  invalid,
  isSubmitting,
  addLabel,
  compact = false,
  onDraftChange,
  onAddParticipant,
  onNameCompositionStart,
  onNameCompositionEnd,
  onNameKeyDown,
}: {
  draft: ParticipantManagementDraft;
  genderOptions: ParticipantManagementOption[];
  ageOptions: ParticipantManagementOption[];
  gradeOptions: ParticipantManagementOption[];
  disabled: boolean;
  invalid: boolean;
  isSubmitting: boolean;
  addLabel: string;
  compact?: boolean;
  onDraftChange: (draft: Partial<ParticipantManagementDraft>) => void;
  onAddParticipant: (nameOverride?: string) => void;
  onNameCompositionStart: () => void;
  onNameCompositionEnd: (value: string) => void;
  onNameKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  if (compact) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_44px_52px_44px_44px] gap-1">
        <ParticipantNameInput
          value={draft.name}
          disabled={disabled}
          invalid={invalid}
          compact
          onChange={(name) => onDraftChange({ name })}
          onCompositionStart={onNameCompositionStart}
          onCompositionEnd={onNameCompositionEnd}
          onKeyDown={onNameKeyDown}
        />
        <Select
          variant="brutalist"
          size="compact"
          value={draft.gender}
          options={genderOptions}
          disabled={disabled}
          onChange={(gender) => onDraftChange({ gender })}
        />
        <Select
          variant="brutalist"
          size="compact"
          value={draft.ageGroup}
          options={ageOptions}
          disabled={disabled}
          onChange={(ageGroup) => onDraftChange({ ageGroup })}
        />
        <Select
          variant="brutalist"
          size="compact"
          value={draft.grade}
          options={gradeOptions}
          disabled={disabled}
          onChange={(grade) => onDraftChange({ grade })}
        />
        <Button
          disabled={disabled}
          onClick={() => onAddParticipant()}
          className="h-11 w-full rounded-none border-2 border-slate-900 bg-slate-900 p-0 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-slate-800 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
          aria-label={addLabel}
        >
          {isSubmitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-[minmax(10rem,1fr)_5rem_6rem_6rem_6.5rem] items-center gap-2">
      <div className="min-w-0">
        <ParticipantNameInput
          value={draft.name}
          disabled={disabled}
          invalid={invalid}
          onChange={(name) => onDraftChange({ name })}
          onCompositionStart={onNameCompositionStart}
          onCompositionEnd={onNameCompositionEnd}
          onKeyDown={onNameKeyDown}
        />
      </div>
      <div className="min-w-0">
        <Select
          variant="brutalist"
          value={draft.gender}
          options={genderOptions}
          disabled={disabled}
          onChange={(gender) => onDraftChange({ gender })}
        />
      </div>
      <div className="min-w-0">
        <Select
          variant="brutalist"
          value={draft.ageGroup}
          options={ageOptions}
          disabled={disabled}
          onChange={(ageGroup) => onDraftChange({ ageGroup })}
        />
      </div>
      <div className="min-w-0">
        <Select
          variant="brutalist"
          value={draft.grade}
          options={gradeOptions}
          disabled={disabled}
          onChange={(grade) => onDraftChange({ grade })}
        />
      </div>
      <Button
        disabled={disabled}
        onClick={() => onAddParticipant()}
        className="h-[50px] w-full rounded-none bg-slate-900 px-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800"
      >
        {isSubmitting ? (
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        추가
      </Button>
    </div>
  );
}

function ParticipantNameInput({
  value,
  disabled,
  invalid,
  compact = false,
  onChange,
  onCompositionStart,
  onCompositionEnd,
  onKeyDown,
}: {
  value: string;
  disabled: boolean;
  invalid: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="text"
      placeholder="이름"
      disabled={disabled}
      className={cn(
        "min-w-0 w-full rounded-none border-2 bg-slate-50 font-medium transition-colors focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400",
        compact ? "h-11 px-2.5 text-[13px]" : "h-[50px] px-4 text-sm",
        invalid
          ? "border-red-300 focus:border-red-500"
          : "border-slate-200 focus:border-slate-900"
      )}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={(event) => onCompositionEnd(event.currentTarget.value)}
      onKeyDown={onKeyDown}
    />
  );
}

function ParticipantMobileRow({
  participant,
  index,
  disabled,
  hasPartnerActions,
  isPartnerSource,
  isPartnerCandidate,
  canRemove,
  onAssignPartner,
  onStartPartnerSelection,
  onClearPartner,
  onRemoveParticipant,
  rowRef,
}: {
  participant: ParticipantManagementItem;
  index: number;
  disabled: boolean;
  hasPartnerActions: boolean;
  isPartnerSource: boolean;
  isPartnerCandidate: boolean;
  canRemove: boolean;
  onAssignPartner?: (participantId: string | number) => void;
  onStartPartnerSelection?: (participantId: string | number) => void;
  onClearPartner?: (participantId: string | number) => void;
  onRemoveParticipant?: (participantId: string | number) => void;
  rowRef: (element: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      onClick={() => {
        if (isPartnerCandidate && !disabled) {
          onAssignPartner?.(participant.id);
        }
      }}
      className={cn(
        "border-b-2 border-slate-100 px-3 py-3 transition-colors",
        isPartnerSource
          ? "bg-violet-50"
          : isPartnerCandidate
            ? disabled
              ? "bg-white"
              : "cursor-pointer bg-white hover:bg-violet-50"
            : "hover:bg-slate-50"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex flex-1 items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
            {String(index + 1).padStart(2, "0")}
          </span>
          {participant.isActive ? (
            <span className="h-2 w-2 shrink-0 bg-emerald-500" />
          ) : null}
          <span className="min-w-0 truncate text-sm font-bold text-slate-900">
            {participant.name}
          </span>
          <span className="shrink-0 text-[10px] font-mono text-slate-500">
            {formatCompactMeta(participant)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasPartnerActions ? (
            <PartnerMobileActions
              participant={participant}
              disabled={disabled}
              isPartnerSource={isPartnerSource}
              isPartnerCandidate={isPartnerCandidate}
              onAssignPartner={onAssignPartner}
              onStartPartnerSelection={onStartPartnerSelection}
              onClearPartner={onClearPartner}
            />
          ) : (
            <ParticipantTrailing participant={participant} />
          )}
          {canRemove ? (
            <button
              type="button"
              disabled={disabled}
              className="flex h-8 w-8 items-center justify-center rounded-none border-2 border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveParticipant?.(participant.id);
              }}
              aria-label={`${participant.name} 삭제`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ParticipantDesktopHeader({
  hasPartnerActions,
  canRemove,
}: {
  hasPartnerActions: boolean;
  canRemove: boolean;
}) {
  if (hasPartnerActions || canRemove) {
    return (
      <div className="grid grid-cols-[48px_minmax(0,1.8fr)_64px_78px_72px_minmax(0,1.4fr)_40px] gap-3 border-b-2 border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 lg:grid-cols-[56px_minmax(0,2fr)_72px_88px_84px_minmax(0,1.5fr)_48px] lg:gap-4">
        <div className="text-center">ID</div>
        <div className="text-center">이름</div>
        <div className="text-center">성별</div>
        <div className="text-center">연령</div>
        <div className="text-center">등급</div>
        <div className="text-center">파트너</div>
        <div className="text-center">관리</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[52px_minmax(0,1.5fr)_minmax(0,1.5fr)_96px_96px] gap-3 border-b-2 border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
      <div className="text-center">ID</div>
      <div>이름</div>
      <div>프로필</div>
      <div className="text-center">경기</div>
      <div className="text-right">기록</div>
    </div>
  );
}

function ParticipantDesktopRow({
  participant,
  index,
  disabled,
  hasPartnerActions,
  isPartnerSource,
  isPartnerCandidate,
  canRemove,
  onAssignPartner,
  onStartPartnerSelection,
  onClearPartner,
  onRemoveParticipant,
  rowRef,
}: {
  participant: ParticipantManagementItem;
  index: number;
  disabled: boolean;
  hasPartnerActions: boolean;
  isPartnerSource: boolean;
  isPartnerCandidate: boolean;
  canRemove: boolean;
  onAssignPartner?: (participantId: string | number) => void;
  onStartPartnerSelection?: (participantId: string | number) => void;
  onClearPartner?: (participantId: string | number) => void;
  onRemoveParticipant?: (participantId: string | number) => void;
  rowRef: (element: HTMLDivElement | null) => void;
}) {
  if (!hasPartnerActions && !canRemove) {
    return (
      <div
        ref={rowRef}
        className="grid grid-cols-[52px_minmax(0,1.5fr)_minmax(0,1.5fr)_96px_96px] items-center gap-3 border-b-2 border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="text-center font-mono text-xs text-slate-400">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {participant.isActive ? <span className="h-2 w-2 bg-emerald-500" /> : null}
          <span className="min-w-0 truncate text-sm font-bold text-slate-900">
            {participant.name}
          </span>
        </div>
        <div className="truncate font-mono text-xs text-slate-600">
          {formatProfileMeta(participant)}
        </div>
        <div className="text-center font-mono text-xs text-slate-600">
          {participant.gamesLabel ?? "-"}
        </div>
        <div className="text-right text-xs font-bold text-slate-500">
          {participant.winLossLabel ?? ""}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      onClick={() => {
        if (isPartnerCandidate && !disabled) {
          onAssignPartner?.(participant.id);
        }
      }}
      className={cn(
        "grid grid-cols-[48px_minmax(0,1.8fr)_64px_78px_72px_minmax(0,1.4fr)_40px] items-center gap-3 border-b-2 border-slate-100 px-4 py-3 transition-colors lg:grid-cols-[56px_minmax(0,2fr)_72px_88px_84px_minmax(0,1.5fr)_48px] lg:gap-4",
        isPartnerSource
          ? "bg-violet-50"
          : isPartnerCandidate
            ? disabled
              ? "bg-white"
              : "cursor-pointer bg-white hover:bg-violet-50"
            : "hover:bg-slate-50"
      )}
    >
      <div className="text-center font-mono text-xs text-slate-400">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="truncate text-sm font-bold text-slate-900">
        {participant.name}
      </div>
      <div className="text-center font-mono text-xs text-slate-600">
        {participant.genderLabel}
      </div>
      <div className="text-center font-mono text-xs text-slate-600">
        {participant.ageLabel}
      </div>
      <div className="flex justify-center">
        {participant.gradeLabel ? (
          <span className="border-2 border-slate-200 bg-slate-100 px-2 py-1 text-xs font-mono font-bold uppercase text-slate-700">
            {participant.gradeLabel}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <PartnerDesktopActions
          participant={participant}
          disabled={disabled}
          isPartnerSource={isPartnerSource}
          isPartnerCandidate={isPartnerCandidate}
          onStartPartnerSelection={onStartPartnerSelection}
          onClearPartner={onClearPartner}
        />
      </div>
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-8 w-8 rounded-none text-slate-400 hover:bg-red-50 hover:text-red-500"
          onClick={(event) => {
            event.stopPropagation();
            onRemoveParticipant?.(participant.id);
          }}
          aria-label={`${participant.name} 삭제`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PartnerMobileActions({
  participant,
  disabled,
  isPartnerSource,
  isPartnerCandidate,
  onAssignPartner,
  onStartPartnerSelection,
  onClearPartner,
}: {
  participant: ParticipantManagementItem;
  disabled: boolean;
  isPartnerSource: boolean;
  isPartnerCandidate: boolean;
  onAssignPartner?: (participantId: string | number) => void;
  onStartPartnerSelection?: (participantId: string | number) => void;
  onClearPartner?: (participantId: string | number) => void;
}) {
  if (isPartnerSource) {
    return (
      <div className="flex h-8 items-center rounded-none border-2 border-violet-300 bg-violet-100 px-2.5 text-[10px] font-mono font-bold text-violet-800">
        선택중
      </div>
    );
  }

  if (isPartnerCandidate) {
    return (
      <button
        type="button"
        disabled={disabled}
        className="flex h-8 items-center rounded-none border-2 border-violet-300 bg-violet-50 px-2.5 text-[10px] font-mono font-bold text-violet-800 hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        onClick={(event) => {
          event.stopPropagation();
          onAssignPartner?.(participant.id);
        }}
      >
        연결
      </button>
    );
  }

  if (participant.partner) {
    return (
      <>
        <button
          type="button"
          title={participant.partner.name}
          disabled={disabled}
          className="flex h-8 max-w-[92px] items-center rounded-none border-2 border-violet-300 bg-violet-50 px-2.5 text-[10px] font-bold text-violet-800 hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          onClick={(event) => {
            event.stopPropagation();
            onStartPartnerSelection?.(participant.id);
          }}
        >
          <span className="truncate">{participant.partner.name}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          className="flex h-8 w-8 items-center justify-center rounded-none border-2 border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          onClick={(event) => {
            event.stopPropagation();
            onClearPartner?.(participant.id);
          }}
          aria-label={`${participant.name} 파트너 해제`}
        >
          <X className="h-3 w-3" />
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className="flex h-8 items-center rounded-none border-2 border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
      onClick={(event) => {
        event.stopPropagation();
        onStartPartnerSelection?.(participant.id);
      }}
    >
      파트너 지정
    </button>
  );
}

function PartnerDesktopActions({
  participant,
  disabled,
  isPartnerSource,
  isPartnerCandidate,
  onStartPartnerSelection,
  onClearPartner,
}: {
  participant: ParticipantManagementItem;
  disabled: boolean;
  isPartnerSource: boolean;
  isPartnerCandidate: boolean;
  onStartPartnerSelection?: (participantId: string | number) => void;
  onClearPartner?: (participantId: string | number) => void;
}) {
  if (isPartnerSource) {
    return (
      <div className="flex items-center gap-2 border-2 border-violet-200 bg-violet-50 px-2 py-2">
        <span className="truncate text-xs font-bold text-slate-900">
          {participant.name}
        </span>
        <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700">
          파트너 선택 중
        </span>
      </div>
    );
  }

  if (isPartnerCandidate) {
    return (
      <div className="flex items-center justify-between gap-2 border-2 border-violet-200 bg-violet-50 px-2 py-2">
        <span
          className={cn(
            "shrink-0 border px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest",
            participant.partner
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-violet-200 bg-white text-violet-700"
          )}
        >
          {participant.partner ? "교체" : "선택"}
        </span>
        <span className="min-w-0 truncate text-xs font-bold text-slate-900">
          이 참가자와 연결
        </span>
      </div>
    );
  }

  if (participant.partner) {
    return (
      <div className="flex items-center justify-between gap-2 border-2 border-violet-200 bg-violet-50 px-2 py-2">
        <div className="min-w-0 truncate text-xs font-bold text-slate-900">
          {participant.partner.name}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            className="border border-violet-200 bg-white px-1.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-violet-700 hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            onClick={(event) => {
              event.stopPropagation();
              onStartPartnerSelection?.(participant.id);
            }}
          >
            변경
          </button>
          <button
            type="button"
            disabled={disabled}
            className="border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            onClick={(event) => {
              event.stopPropagation();
              onClearPartner?.(participant.id);
            }}
          >
            해제
          </button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className="h-9 w-full rounded-none border-2 border-slate-200 bg-white px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700"
      onClick={(event) => {
        event.stopPropagation();
        onStartPartnerSelection?.(participant.id);
      }}
    >
      파트너 지정
    </Button>
  );
}

function ParticipantTrailing({ participant }: { participant: ParticipantManagementItem }) {
  return (
    <div className="shrink-0 text-right">
      {participant.isActive ? (
        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600">
          경기 중
        </div>
      ) : null}
      {participant.winLossLabel ? (
        <div
          className={cn(
            "text-[11px] font-bold text-zinc-500",
            participant.isActive ? "mt-1" : ""
          )}
        >
          {participant.winLossLabel}
        </div>
      ) : null}
    </div>
  );
}

function EmptyParticipantState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[176px] flex-col items-center justify-center px-6 py-10 text-center md:min-h-[196px] md:py-0">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-xs font-mono text-slate-500">{description}</div>
    </div>
  );
}

function formatCompactMeta(participant: ParticipantManagementItem) {
  return [
    participant.genderLabel,
    participant.ageLabel,
    participant.gradeLabel,
    participant.gamesLabel,
  ]
    .filter(Boolean)
    .join("·");
}

function formatProfileMeta(participant: ParticipantManagementItem) {
  return [participant.genderLabel, participant.ageLabel, participant.gradeLabel]
    .filter(Boolean)
    .join(" · ");
}
