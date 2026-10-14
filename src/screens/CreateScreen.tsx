import type { AppScreenContext } from "../useAppController";
type ScreenContext = Pick<
  AppScreenContext,
  | "ArrowRight"
  | "BackgroundEditor"
  | "Circle"
  | "DEFAULT_EDITS"
  | "DEFAULT_PORTRAIT"
  | "Heart"
  | "ImagePlus"
  | "Layers"
  | "Leaf"
  | "MAX_LINES"
  | "PeopleRegionEditor"
  | "PersonBackground"
  | "PhotoActions"
  | "PhotoQualityAdvice"
  | "PortraitSamplingPanel"
  | "Preview"
  | "ResultSubject"
  | "RotateCcw"
  | "ShapeCropEditor"
  | "ShieldCheck"
  | "Square"
  | "SubjectAdvice"
  | "SubjectChooser"
  | "SubjectMarksEditor"
  | "Supply"
  | "Upload"
  | "activeBackground"
  | "activePeopleMask"
  | "adviceCrop"
  | "adviceResult"
  | "analysis"
  | "applyCrop"
  | "applySettings"
  | "aspect"
  | "assemblyEffort"
  | "backgroundBusy"
  | "backgroundOptions"
  | "backgroundText"
  | "boardHeight"
  | "busy"
  | "cancelGeneration"
  | "changeComputationResolution"
  | "changePreset"
  | "chooseSubject"
  | "clearOptimizerRecovery"
  | "continuationStrategy"
  | "croppedPeople"
  | "currentMarks"
  | "currentSettingsMatch"
  | "currentTargetHash"
  | "customerError"
  | "edits"
  | "estimatedPairPortrait"
  | "fitAllPeople"
  | "fraction"
  | "generalImageConfirmed"
  | "generalSubject"
  | "generate"
  | "group"
  | "headOutline"
  | "headPriority"
  | "image"
  | "jobs"
  | "lines"
  | "loaded"
  | "locale"
  | "makerPresets"
  | "marksKey"
  | "mode"
  | "name"
  | "pace"
  | "peopleFitUndo"
  | "photo"
  | "photoCandidates"
  | "photoId"
  | "pinBasis"
  | "pinCount"
  | "pinLayout"
  | "portrait"
  | "portraitChoiceText"
  | "portraitHelp"
  | "portraitSolver"
  | "preset"
  | "presetName"
  | "qualityAdvice"
  | "ranges"
  | "recovery"
  | "resolution"
  | "result"
  | "reviewedFacePortrait"
  | "reviewedPeoplePortrait"
  | "sample"
  | "sampling"
  | "save"
  | "savePreset"
  | "selectPhoto"
  | "selectedPreset"
  | "setBackgroundBusy"
  | "setBusy"
  | "setEdits"
  | "setError"
  | "setGeneralImageConfirmed"
  | "setGroup"
  | "setHeadOutline"
  | "setHeadPriority"
  | "setHeightMm"
  | "setImage"
  | "setLines"
  | "setMakerPresets"
  | "setMode"
  | "setName"
  | "setNotice"
  | "setPeopleFitUndo"
  | "setPhotoCandidates"
  | "setPinBasis"
  | "setPinCoordinates"
  | "setPinCount"
  | "setPinLayout"
  | "setPortrait"
  | "setPortraitSolver"
  | "setPreset"
  | "setPresetName"
  | "setRecovery"
  | "setSelectedPreset"
  | "setShape"
  | "setStockMeters"
  | "setStrongSubjectFit"
  | "setSubjectMarks"
  | "setThreadMm"
  | "setVariantState"
  | "setWidthMm"
  | "shape"
  | "simple"
  | "stockMeters"
  | "storefront"
  | "strongSubjectFit"
  | "subjectFitText"
  | "subjectKind"
  | "subjectMetricLabel"
  | "subjectScreens"
  | "subjectText"
  | "switchPhoto"
  | "t"
  | "targetCanvas"
  | "threadMm"
  | "unconfirmedPeople"
  | "unreviewedPeople"
  | "upload"
  | "variantState"
  | "variants"
  | "widthMm"
  | "worker"
>;
export function CreateScreen({ context }: { context: ScreenContext }) {
  const {
    ArrowRight,
    BackgroundEditor,
    Circle,
    DEFAULT_EDITS,
    DEFAULT_PORTRAIT,
    Heart,
    ImagePlus,
    Layers,
    Leaf,
    MAX_LINES,
    PeopleRegionEditor,
    PersonBackground,
    PhotoActions,
    PhotoQualityAdvice,
    PortraitSamplingPanel,
    Preview,
    ResultSubject,
    RotateCcw,
    ShapeCropEditor,
    ShieldCheck,
    Square,
    SubjectAdvice,
    SubjectChooser,
    SubjectMarksEditor,
    Supply,
    Upload,
    activeBackground,
    activePeopleMask,
    adviceCrop,
    adviceResult,
    analysis,
    applyCrop,
    applySettings,
    aspect,
    assemblyEffort,
    backgroundBusy,
    backgroundOptions,
    backgroundText,
    boardHeight,
    busy,
    cancelGeneration,
    changeComputationResolution,
    changePreset,
    chooseSubject,
    clearOptimizerRecovery,
    continuationStrategy,
    croppedPeople,
    currentMarks,
    currentSettingsMatch,
    currentTargetHash,
    customerError,
    edits,
    estimatedPairPortrait,
    fitAllPeople,
    fraction,
    generalImageConfirmed,
    generalSubject,
    generate,
    group,
    headOutline,
    headPriority,
    image,
    jobs,
    lines,
    loaded,
    locale,
    makerPresets,
    marksKey,
    mode,
    name,
    pace,
    peopleFitUndo,
    photo,
    photoCandidates,
    photoId,
    pinBasis,
    pinCount,
    pinLayout,
    portrait,
    portraitChoiceText,
    portraitHelp,
    portraitSolver,
    preset,
    presetName,
    qualityAdvice,
    ranges,
    recovery,
    resolution,
    result,
    reviewedFacePortrait,
    reviewedPeoplePortrait,
    sample,
    sampling,
    save,
    savePreset,
    selectPhoto,
    selectedPreset,
    setBackgroundBusy,
    setBusy,
    setEdits,
    setError,
    setGeneralImageConfirmed,
    setGroup,
    setHeadOutline,
    setHeadPriority,
    setHeightMm,
    setImage,
    setLines,
    setMakerPresets,
    setMode,
    setName,
    setNotice,
    setPeopleFitUndo,
    setPhotoCandidates,
    setPinBasis,
    setPinCoordinates,
    setPinCount,
    setPinLayout,
    setPortrait,
    setPortraitSolver,
    setPreset,
    setPresetName,
    setRecovery,
    setSelectedPreset,
    setShape,
    setStockMeters,
    setStrongSubjectFit,
    setSubjectMarks,
    setThreadMm,
    setVariantState,
    setWidthMm,
    shape,
    simple,
    stockMeters,
    storefront,
    strongSubjectFit,
    subjectFitText,
    subjectKind,
    subjectMetricLabel,
    subjectScreens,
    subjectText,
    switchPhoto,
    t,
    targetCanvas,
    threadMm,
    unconfirmedPeople,
    unreviewedPeople,
    upload,
    variantState,
    variants,
    widthMm,
    worker,
  } = context;
  return (
    <>
      <section className="intro simple-intro">
        <div>
          <h1>
            {(!image && storefront.homeTitle[locale]) ||
              simple(image ? "adjustTitle" : "startTitle")}
          </h1>
          <p>{simple(image ? "adjustHint" : "startHint")}</p>
        </div>
      </section>
      <div
        className={
          image ? "workspace simple-workspace" : "workspace simple-start"
        }
      >
        <div className="editor-column">
          <section
            className="card photo-card"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy && e.dataTransfer.files[0])
                void selectPhoto(e.dataTransfer.files[0]);
            }}
          >
            <div className="section-label">
              {t("step1")}
              <ImagePlus size={17} />
            </div>
            {/* Photo-first start keeps two source actions; the subject is chosen for the loaded photo. */}
            {image && (
              <>
                <SubjectChooser
                  value={subjectKind}
                  locale={locale}
                  disabled={busy}
                  onChoose={(kind) => chooseSubject(kind)}
                />
                <p className="fineprint">{subjectText(locale, "hint")}</p>
              </>
            )}
            <PhotoActions
              locale={locale}
              onPhoto={selectPhoto}
              uploadRef={upload}
              hint={false}
              disabled={busy}
            />
            <p className="photo-guidance" data-testid="photo-guidance">
              {t("photoGuidance")}
            </p>
            {busy && !image && !recovery && (
              <div data-testid="saved-calculation-running">
                <p>
                  {t("generating")} {Math.round(fraction * 100)}%
                </p>
                <progress max="1" value={fraction} />
                <button className="text-button" onClick={cancelGeneration}>
                  {t("cancel")}
                </button>
              </div>
            )}
            {recovery && (
              <div className="fineprint" data-testid="optimizer-recovery">
                <p>{t("recoveryNotice")}</p>
                {recovery.hairSeed && !recovery.hairCheckpoint ? (
                  <>
                    <p>{t("legacyHairRecovery")}</p>
                    <button
                      className="outline full"
                      disabled={busy || !loaded}
                      onClick={() => void save(recovery.hairSeed)}
                    >
                      {t("keepRecoveredGuide")}
                    </button>
                  </>
                ) : (
                  <button
                    disabled={busy}
                    className="outline full"
                    onClick={() =>
                      generate(recovery.seed, recovery.strategy, recovery)
                    }
                  >
                    {t("resumeOptimization")}
                  </button>
                )}
                <button
                  disabled={busy}
                  className="text-button"
                  onClick={() =>
                    clearOptimizerRecovery()
                      .then(() => setRecovery(undefined))
                      .catch(() => setNotice(t("recoveryFailed")))
                  }
                >
                  {t("discardOptimization")}
                </button>
                {busy && !image && (
                  <>
                    <p role="status">{t("generating")}</p>
                    <button className="text-button" onClick={cancelGeneration}>
                      {t("cancel")}
                    </button>
                  </>
                )}
              </div>
            )}
            {image && (
              <>
                {shape === "heart" && !generalSubject && (
                  <p
                    className="workflow-notice"
                    data-testid="heart-people-guidance"
                  >
                    {portraitHelp(locale, "heart")}
                  </p>
                )}
                <div className="preset-row">
                  <button
                    className="outline"
                    onClick={() =>
                      applyCrop({
                        ...edits,
                        rotation:
                          edits.rotation <= -180 ? 90 : edits.rotation - 90,
                      })
                    }
                  >
                    {portraitHelp(locale, "rotateLeft")}
                  </button>
                  <button
                    className="outline"
                    onClick={() =>
                      applyCrop({
                        ...edits,
                        rotation:
                          edits.rotation >= 180 ? -90 : edits.rotation + 90,
                      })
                    }
                  >
                    {portraitHelp(locale, "rotateRight")}
                  </button>
                  {!generalSubject &&
                    (activeBackground?.faces?.length ?? 0) > 1 && (
                      <button
                        className="outline"
                        data-testid="apply-people-faces"
                        onClick={() => {
                          if (
                            (resolution > 192 && !strongSubjectFit) ||
                            pinCount > 240 ||
                            pinBasis
                          ) {
                            setError("portrait-config/group");
                            return;
                          }
                          try {
                            // Detector boxes are suggestions; each person is confirmed separately.
                            setPortrait(
                              unconfirmedPeople(
                                reviewedPeoplePortrait(
                                  activeBackground!.faces!,
                                  portrait,
                                  edits,
                                  image.width,
                                  image.height,
                                  aspect,
                                  resolution,
                                  shape,
                                ),
                              ),
                            );
                            setGroup(true);
                            setPortraitSolver("guarded");
                          } catch (e) {
                            setError(String(e));
                          }
                        }}
                      >
                        {portraitHelp(locale, "usePeople")}
                      </button>
                    )}
                  {!generalSubject && (
                    <button
                      className="outline"
                      data-testid="mark-two-faces"
                      onClick={() => {
                        if (
                          (resolution > 192 && !strongSubjectFit) ||
                          pinCount > 240 ||
                          pinBasis
                        ) {
                          setError("portrait-config/group");
                          return;
                        }
                        setGroup(true);
                        setPortraitSolver("guarded");
                        setPortrait(estimatedPairPortrait(portrait));
                        const panel =
                          document.querySelector<HTMLDetailsElement>(
                            '[data-testid="advanced-photo"]',
                          );
                        if (panel) panel.open = true;
                      }}
                    >
                      {portraitHelp(locale, "manualPeople")}
                    </button>
                  )}
                </div>
                {!generalSubject && (
                  <PhotoQualityAdvice advice={qualityAdvice} locale={locale} />
                )}
                <SubjectAdvice
                  advice={adviceResult}
                  locale={locale}
                  disabled={busy}
                  onFix={(item) => {
                    if (item.fix === "photo") {
                      upload.current?.click();
                      return;
                    }
                    applyCrop(
                      adviceCrop(
                        edits,
                        adviceResult?.subject,
                        aspect,
                        resolution,
                        item.key === "small" ? item.value : undefined,
                      ),
                    );
                  }}
                />
                <details
                  className="edits"
                  data-testid="background-options"
                  ref={backgroundOptions}
                >
                  <summary>
                    {simple("background")}
                    {backgroundBusy ? ` · ${simple("preparing")}` : ""}
                  </summary>
                  {!sample && photoCandidates.find((p) => p.id === photoId) && (
                    <PersonBackground
                      key={`${photoId}:${subjectKind}`}
                      kind={subjectKind}
                      source={
                        photoCandidates.find((p) => p.id === photoId)!.original
                      }
                      initial={
                        photoCandidates.find((p) => p.id === photoId)!
                          .background
                      }
                      locale={locale}
                      group={group}
                      onUseFace={(face) => {
                        setPortrait(
                          reviewedFacePortrait(
                            face,
                            portrait,
                            edits,
                            image.width,
                            image.height,
                            aspect,
                            resolution,
                            shape,
                          ),
                        );
                        setLines(MAX_LINES);
                      }}
                      onBusy={setBackgroundBusy}
                      onChange={(background, prepared) => {
                        if (
                          background.status === "ready" &&
                          (background.faces?.length ?? 0) > 1 &&
                          background.faces !== activeBackground?.faces
                        ) {
                          setGroup(true);
                          setHeadOutline([]);
                          setPortrait((v) => ({
                            ...v,
                            enabled: false,
                          }));
                        }
                        jobs.current.cancel();
                        worker.current?.terminate();
                        worker.current = null;
                        setBusy(false);
                        setImage(prepared);
                        setPhotoCandidates((v) =>
                          v.map((p) =>
                            p.id === photoId
                              ? {
                                  ...p,
                                  image: prepared,
                                  background,
                                  sourceRevision: crypto.randomUUID(),
                                }
                              : p,
                          ),
                        );
                        // Source segmentation replaces the old single-face oval softening.
                        if (background.enabled && background.mask)
                          setPortrait((v) => ({
                            ...v,
                            background: 0,
                          }));
                      }}
                    />
                  )}
                </details>
                <details className="edits" open={group}>
                  <summary>{simple("people")}</summary>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={group}
                      onChange={(e) => {
                        setGroup(e.target.checked);
                        setHeadOutline([]);
                        if (e.target.checked)
                          setPortrait((v) => ({
                            ...v,
                            people: undefined,
                            enabled: false,
                          }));
                      }}
                    />
                    {backgroundText(locale, "group")}
                  </label>
                  {group && (
                    <>
                      <p className="workflow-notice">
                        {backgroundText(locale, "groupHint")}
                      </p>
                      <div className="preset-row">
                        <button
                          className="outline"
                          data-testid="fit-all-people"
                          disabled={backgroundBusy}
                          onClick={() => {
                            try {
                              const fit = fitAllPeople(
                                shape,
                                activePeopleMask,
                                edits,
                                aspect,
                                widthMm,
                                boardHeight,
                                image.width,
                                image.height,
                                resolution,
                              );
                              setPeopleFitUndo({
                                edits: { ...edits },
                                portrait: structuredClone(portrait),
                              });
                              applyCrop(fit.edits);
                            } catch (e) {
                              setError(String(e));
                            }
                          }}
                        >
                          {backgroundText(locale, "fitPeople")}
                        </button>
                        <button
                          className="outline"
                          data-testid="undo-people-fit"
                          disabled={!peopleFitUndo}
                          onClick={() => {
                            if (peopleFitUndo) {
                              setEdits(peopleFitUndo.edits);
                              setPortrait(peopleFitUndo.portrait);
                              setPeopleFitUndo(undefined);
                            }
                          }}
                        >
                          {backgroundText(locale, "undoPeople")}
                        </button>
                      </div>
                      <p className="fineprint">
                        {backgroundText(locale, "peopleFitHint")}
                      </p>
                      {croppedPeople !== undefined && croppedPeople > 0.005 && (
                        <p
                          className="workflow-notice"
                          role="status"
                          data-testid="people-cropped"
                        >
                          {backgroundText(locale, "peopleCropped")}{" "}
                          {Math.round(croppedPeople * 100)}%
                        </p>
                      )}
                    </>
                  )}
                </details>
                <ShapeCropEditor
                  key={`${photoId ?? "sample"}-${shape}`}
                  shape={shape}
                  group={group}
                  edits={edits}
                  portrait={portrait}
                  aspect={aspect}
                  widthMm={widthMm}
                  heightMm={boardHeight}
                  resolution={resolution}
                  imageWidth={image.width}
                  imageHeight={image.height}
                  headOutline={headOutline}
                  onOutline={setHeadOutline}
                  t={t}
                  onCrop={applyCrop}
                  onFace={setPortrait}
                  onRestore={(e, s) => {
                    setEdits(e);
                    setPortrait(s);
                  }}
                >
                  <canvas
                    ref={photo}
                    width={384}
                    height={384}
                    aria-label="Edited photo"
                  />
                  <button
                    className="floating"
                    aria-label={t("upload")}
                    onClick={() => upload.current?.click()}
                  >
                    <Upload size={17} />
                  </button>
                </ShapeCropEditor>
                <details className="edits" data-testid="subject-fit-options">
                  <summary>{subjectFitText(locale, "title")}</summary>
                  <label>
                    <input
                      type="checkbox"
                      data-testid="subject-fit-enable"
                      checked={strongSubjectFit}
                      disabled={busy}
                      onChange={(e) => {
                        setStrongSubjectFit(e.target.checked);
                        setHeadPriority(false);
                      }}
                    />
                    {subjectFitText(locale, "enable")}
                  </label>
                  <p className="fineprint">{subjectFitText(locale, "hint")}</p>
                </details>
                {sample && <p className="fineprint">{t("sampleNotice")}</p>}
                {!generalSubject && (
                  <section
                    className="notice"
                    data-testid="portrait-quality-setup"
                    aria-label={portraitChoiceText(locale, "title")}
                  >
                    <h3>{portraitChoiceText(locale, "title")}</h3>
                    <p className="fineprint">
                      {portraitChoiceText(locale, "localInput")}
                    </p>
                    <p>{portraitChoiceText(locale, "hint")}</p>
                    <button
                      disabled={busy || backgroundBusy}
                      onClick={() => {
                        const face =
                          activeBackground?.faces?.length === 1
                            ? activeBackground.faces[0]
                            : undefined;
                        if (face && !group) {
                          try {
                            setPortrait(
                              reviewedFacePortrait(
                                face,
                                portrait,
                                edits,
                                image.width,
                                image.height,
                                aspect,
                                resolution,
                                shape,
                              ),
                            );
                            setLines(MAX_LINES);
                          } catch (e) {
                            setError(String(e));
                          }
                        }
                        const panel =
                          document.querySelector<HTMLDetailsElement>(
                            '[data-testid="advanced-photo"]',
                          );
                        if (panel) {
                          panel.open = true;
                          panel.scrollIntoView({ block: "start" });
                        }
                      }}
                    >
                      {portraitChoiceText(locale, "review")}
                    </button>
                    {portrait.regions?.placement !== "manual" && (
                      <p>{portraitChoiceText(locale, "pending")}</p>
                    )}
                    <button
                      data-testid="portrait-current-materials"
                      disabled={
                        busy ||
                        !portrait.enabled ||
                        portrait.regions?.placement !== "manual" ||
                        resolution > 192 ||
                        pinCount > 240 ||
                        Boolean(pinBasis) ||
                        mode === "color"
                      }
                      onClick={() => {
                        setPortraitSolver(
                          portrait.people ? "guarded" : "physical",
                        );
                        setLines(MAX_LINES);
                        setHeadPriority(false);
                        setError("");
                      }}
                    >
                      {portraitChoiceText(locale, "keep")}
                    </button>
                    <p>{portraitChoiceText(locale, "detailHint")}</p>
                    <button
                      data-testid="portrait-detail-profile"
                      disabled={
                        busy ||
                        !portrait.enabled ||
                        Boolean(portrait.people) ||
                        portrait.regions?.placement !== "manual" ||
                        aspect !== 1
                      }
                      onClick={() => {
                        changeComputationResolution(320);
                        setShape("circle");
                        setMode("dark");
                        setWidthMm(400);
                        setHeightMm(400);
                        setPinCount(240);
                        setThreadMm(0.1);
                        setPinBasis({
                          version: "circle-chords/1",
                          count: 240,
                          minimumAngularGapDegrees: 7.5,
                          experimental: true,
                        });
                        setPinLayout(undefined);
                        setPinCoordinates(undefined);
                        setPortraitSolver("basis");
                        setLines(MAX_LINES);
                        setHeadPriority(false);
                        setError("");
                      }}
                    >
                      {portraitChoiceText(locale, "detail")}
                    </button>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={generalImageConfirmed}
                        onChange={(e) =>
                          setGeneralImageConfirmed(e.target.checked)
                        }
                      />
                      {portraitChoiceText(locale, "general")}
                    </label>
                  </section>
                )}
                <details className="edits" data-testid="advanced-photo">
                  <summary>{simple("advancedPhoto")}</summary>
                  {!generalSubject && (
                    <>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={portrait.enabled}
                          // A group gets portrait weighting from its people
                          // editor, not from a single-face toggle.
                          disabled={group && !portrait.people}
                          onChange={(e) => {
                            setPortrait((v) => ({
                              ...v,
                              enabled: e.target.checked,
                            }));
                            if (e.target.checked) setLines(MAX_LINES);
                          }}
                        />
                        {t("portraitMode")}
                      </label>
                      <p className="fineprint">{t("portraitHint")}</p>
                      {!portrait.enabled && (
                        <p role="status" className="workflow-notice">
                          {t("portraitOffNotice")}
                        </p>
                      )}
                    </>
                  )}
                  <p className="workflow-notice" data-testid="actual-settings">
                    {t("actualSettings")}: {shape} · {widthMm} × {boardHeight}{" "}
                    mm · {pinCount} {t("pinCount")} · {threadMm} mm ·{" "}
                    {strongSubjectFit
                      ? subjectFitText(locale, "enable")
                      : portrait.enabled && portrait.people
                        ? portraitHelp(locale, "groupSolver")
                        : portrait.enabled && mode !== "color"
                          ? t(
                              `${portraitSolver === "global" ? "global" : portraitSolver}Solver` as import("../i18n").Key,
                            )
                          : t("continuousSolver")}
                  </p>
                  {portrait.enabled && mode !== "color" && (
                    <label className="check">
                      <input
                        type="checkbox"
                        aria-label={t("portraitDetail")}
                        checked={Boolean(portrait.detailStyle)}
                        disabled={busy}
                        onChange={(e) =>
                          setPortrait((p) => {
                            const { detailStyle: _old, ...rest } = p;
                            return e.target.checked
                              ? {
                                  ...rest,
                                  detailStyle: "contour-preparation/2",
                                }
                              : rest;
                          })
                        }
                      />
                      <span>
                        {t("portraitDetail")}
                        <small className="fineprint">
                          {t("portraitDetailHint")}
                        </small>
                      </span>
                    </label>
                  )}
                  {portrait.enabled &&
                    mode !== "color" &&
                    portrait.detailStyle && (
                      <label className="check">
                        <input
                          type="checkbox"
                          aria-label={t("preservePortraitTone")}
                          checked={
                            portrait.detailStyle === "contour-preparation/2"
                          }
                          disabled={busy}
                          onChange={(e) =>
                            setPortrait((p) => ({
                              ...p,
                              detailStyle: e.target.checked
                                ? "contour-preparation/2"
                                : "contour-preparation/1",
                            }))
                          }
                        />
                        <span>{t("preservePortraitTone")}</span>
                      </label>
                    )}
                  {portrait.enabled && mode !== "color" && (
                    <label>
                      {t("portraitSolver")}
                      <select
                        aria-label={t("portraitSolver")}
                        value={portraitSolver}
                        onChange={(e) => {
                          if (e.target.value === "basis") {
                            setPinCount((v) => (v === 240 ? 240 : 320));
                            setPinBasis(undefined);
                            setPinLayout(undefined);
                            setPinCoordinates(undefined);
                          } else if (pinCount > 240) {
                            setPinCount(240);
                            setPinBasis(undefined);
                            setPinLayout(undefined);
                            setPinCoordinates(undefined);
                          }
                          if (
                            e.target.value !== "basis" &&
                            resolution === 320 &&
                            !strongSubjectFit
                          )
                            changeComputationResolution(160);
                          setPortraitSolver(
                            e.target.value as
                              | "continuous"
                              | "global"
                              | "guarded"
                              | "multiscale"
                              | "physical"
                              | "anatomy"
                              | "basis",
                          );
                        }}
                      >
                        <option value="continuous">
                          {t("continuousSolver")}
                        </option>
                        <option value="guarded">
                          {portrait.people
                            ? portraitHelp(locale, "groupSolver")
                            : t("guardedSolver")}
                        </option>
                        <option
                          value="anatomy"
                          disabled={
                            Boolean(portrait.people) ||
                            portrait.regions?.placement !== "manual"
                          }
                        >
                          {t("anatomySolver")}
                        </option>
                        <option
                          value="basis"
                          disabled={
                            Boolean(portrait.people) || shape !== "circle"
                          }
                        >
                          {t("basisSolver")}
                        </option>
                        <option
                          value="physical"
                          disabled={Boolean(portrait.people)}
                        >
                          {t("physicalSolver")}
                        </option>
                        <option
                          value="multiscale"
                          disabled={Boolean(portrait.people)}
                        >
                          {t("multiscaleSolver")}
                        </option>
                        <option
                          value="global"
                          disabled={Boolean(portrait.people)}
                        >
                          {t("globalSolver")}
                        </option>
                      </select>
                      <span className="fineprint">
                        {t("globalHint")} {t("guardHint")}
                        {portraitSolver === "basis" && <> {t("basisHint")}</>}
                      </span>
                    </label>
                  )}
                  <label>
                    <span>{t("computationResolution")}</span>
                    <select
                      aria-label={t("computationResolution")}
                      value={resolution}
                      disabled={busy}
                      onChange={(e) =>
                        changeComputationResolution(Number(e.target.value))
                      }
                    >
                      {![160, 192, 320].includes(resolution) && (
                        <option value={resolution}>
                          {resolution} × {resolution}
                        </option>
                      )}
                      <option value={160}>160 × 160</option>
                      <option value={192}>
                        192 × 192 · {t("experimental")}
                      </option>
                      <option
                        value={320}
                        disabled={
                          portraitSolver !== "basis" && !strongSubjectFit
                        }
                      >
                        320 × 320 · {t("experimental")}
                      </option>
                    </select>
                    <span className="fineprint">
                      {t("resolutionHint")} {t("resolvedHint")}
                    </span>
                  </label>
                  {portraitSolver === "basis" && resolution === 320 && (
                    <label className="fineprint">
                      <input
                        type="checkbox"
                        data-testid="head-priority"
                        checked={headPriority}
                        onChange={(e) => setHeadPriority(e.target.checked)}
                      />{" "}
                      {t("headPriority")}
                      <span>{t("headPriorityHint")}</span>
                    </label>
                  )}
                  {strongSubjectFit && !portrait.enabled ? (
                    <SubjectMarksEditor
                      subjects={currentMarks}
                      n={resolution}
                      aspect={aspect}
                      locale={locale}
                      disabled={busy}
                      onChange={(subjects) =>
                        setSubjectMarks((v) => ({
                          ...v,
                          [marksKey]: subjects,
                        }))
                      }
                    >
                      <canvas
                        ref={targetCanvas}
                        width={resolution}
                        height={resolution}
                        aria-label={t("processedTarget")}
                      />
                    </SubjectMarksEditor>
                  ) : (
                    <PeopleRegionEditor
                      canAddPeople={!pinBasis && pinCount <= 240}
                      locale={locale}
                      resolution={resolution}
                      portrait={portrait}
                      setPortrait={setPortrait}
                      image={
                        photoCandidates.find((p) => p.id === photoId)
                          ?.original ?? image
                      }
                      edits={edits}
                      aspect={aspect}
                      t={t}
                    >
                      <canvas
                        ref={targetCanvas}
                        width={resolution}
                        height={resolution}
                        aria-label={t("processedTarget")}
                      />
                    </PeopleRegionEditor>
                  )}
                  {portrait.enabled && sampling && (
                    <PortraitSamplingPanel sampling={sampling} t={t} />
                  )}
                  <p className="fineprint">
                    {t("processedTarget")} · {resolution} × {resolution} ·{" "}
                    {t("originalCrop")}
                  </p>
                  <div hidden={!portrait.enabled}>
                    <BackgroundEditor
                      image={image}
                      edits={edits}
                      aspect={aspect}
                      portrait={portrait}
                      setPortrait={setPortrait}
                      t={t}
                    />
                  </div>
                  {portrait.enabled && (
                    <>
                      <details
                        className="edits"
                        hidden={Boolean(portrait.people)}
                      >
                        <summary>{t("faceRegion")}</summary>
                        <p className="fineprint">{t("regionHint")}</p>
                        {(["left", "top", "width", "height"] as const).map(
                          (key) => (
                            <label className="range-label" key={key}>
                              <span>{t(key)}</span>
                              <input
                                aria-label={`${t("faceRegion")} ${t(key)}`}
                                type="range"
                                min={
                                  key === "width" || key === "height" ? 0.1 : 0
                                }
                                max={
                                  key === "left"
                                    ? 1 - portrait.face.width
                                    : key === "top"
                                      ? 1 - portrait.face.height
                                      : key === "width"
                                        ? 1 - portrait.face.left
                                        : 1 - portrait.face.top
                                }
                                step=".01"
                                value={portrait.face[key]}
                                onChange={(e) =>
                                  setPortrait((v) => ({
                                    ...v,
                                    face: {
                                      ...v.face,
                                      [key]: +e.target.value,
                                    },
                                  }))
                                }
                              />
                              <output>
                                {Math.round(portrait.face[key] * 100)}%
                              </output>
                            </label>
                          ),
                        )}
                        {(["background", "localContrast"] as const).map(
                          (key) => (
                            <label className="range-label" key={key}>
                              <span>{t(key)}</span>
                              <input
                                aria-label={t(key)}
                                type="range"
                                min="0"
                                max="1"
                                step=".05"
                                value={portrait[key]}
                                onChange={(e) =>
                                  setPortrait((v) => ({
                                    ...v,
                                    [key]: +e.target.value,
                                  }))
                                }
                              />
                              <output>{portrait[key]}</output>
                            </label>
                          ),
                        )}
                        <button
                          className="text-button"
                          onClick={() =>
                            setPortrait({
                              ...structuredClone(DEFAULT_PORTRAIT),
                              enabled: true,
                            })
                          }
                        >
                          {t("resetPortrait")}
                        </button>
                      </details>
                    </>
                  )}
                  <div
                    className="photo-candidates"
                    aria-label={t("photoCandidates")}
                  >
                    {photoCandidates.map((p) => (
                      <button
                        key={p.id}
                        className={p.id === photoId ? "chip selected" : "chip"}
                        onClick={() => switchPhoto(p)}
                        title={p.name}
                      >
                        {p.name}
                      </button>
                    ))}
                    <button
                      className="text-button"
                      onClick={() => upload.current?.click()}
                    >
                      {t("addPhoto")}
                    </button>
                  </div>
                  <p className="fineprint">{t("candidatePrivacy")}</p>
                  <details className="edits">
                    <summary>
                      {t("zoom")} · {t("contrast")}
                    </summary>
                    {ranges.map((r) => (
                      <label key={r.key} className="range-label">
                        <span>{t(r.key)}</span>
                        <input
                          aria-label={t(r.key)}
                          type="range"
                          {...{ min: r.min, max: r.max, step: r.step }}
                          value={edits[r.key]}
                          onChange={(e) => {
                            applyCrop({
                              ...edits,
                              [r.key]: +e.target.value,
                            });
                          }}
                        />
                        <output>{edits[r.key]}</output>
                      </label>
                    ))}
                    <button
                      className="text-button"
                      onClick={() => {
                        applyCrop(DEFAULT_EDITS);
                      }}
                    >
                      <RotateCcw size={14} />
                      {t("reset")}
                    </button>
                  </details>
                </details>
              </>
            )}
            <div className="photo-note">
              <ShieldCheck size={16} />
              <span>
                {image && analysis
                  ? t(
                      analysis.contrast < 30
                        ? "lowContrast"
                        : analysis.edgeVariation < 3
                          ? "blur"
                          : analysis.shadowFraction > 0.4
                            ? "shadow"
                            : "goodPhoto",
                    )
                  : t("private")}
              </span>
            </div>
          </section>
          {image && (
            <section className="card settings-card">
              <p className="fineprint" data-testid="material-summary">
                {t("materialSettings")}: {widthMm} × {boardHeight} mm ·{" "}
                {pinCount} {t("pinCount")} · {threadMm} mm
              </p>
              <details className="edits" data-testid="advanced-generation">
                <summary>{simple("advancedGeneration")}</summary>
                <div className="section-label">
                  {t("step2")}
                  <Layers size={17} />
                </div>
                <details className="edits">
                  <summary>{t("settingsPresets")}</summary>
                  <label className="field-label" htmlFor="maker-preset">
                    {t("settingsPresets")}
                  </label>
                  <select
                    id="maker-preset"
                    value={selectedPreset}
                    onChange={(e) => {
                      setSelectedPreset(e.target.value);
                      const p = makerPresets.find(
                        (p) => p.id === e.target.value,
                      );
                      if (p) applySettings(p.settings);
                    }}
                  >
                    <option value="">{t("choosePreset")}</option>
                    {makerPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <label className="field-label" htmlFor="preset-name">
                    {t("presetName")}
                  </label>
                  <input
                    id="preset-name"
                    maxLength={60}
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                  <div className="preset-row">
                    <button
                      className="outline"
                      disabled={!presetName.trim()}
                      onClick={() => void savePreset()}
                    >
                      {t("savePreset")}
                    </button>
                    <button
                      className="text-button"
                      disabled={!selectedPreset}
                      onClick={() =>
                        void changePreset(null, selectedPreset)
                          .then((p) => {
                            setMakerPresets(p);
                            setSelectedPreset("");
                          })
                          .catch((e) => setError(String(e)))
                      }
                    >
                      {t("deletePreset")}
                    </button>
                  </div>
                  <p className="fineprint">{t("presetPrivacy")}</p>
                </details>
                {pinLayout && (
                  <div className="notice" data-testid="layout-settings">
                    <p>
                      {t("layoutNotice")} {pinLayout.phaseDegreesClockwise}° ·{" "}
                      {pinLayout.version}
                    </p>
                    <button
                      className="outline"
                      onClick={() => {
                        setPinLayout(undefined);
                        setPinCoordinates(undefined);
                      }}
                    >
                      {t("defaultLayout")}
                    </button>
                  </div>
                )}
                <label className="field-label">{t("shape")}</label>
                <div className="shape-buttons">
                  {(
                    [
                      { id: "circle", icon: Circle },
                      { id: "rectangle", icon: Square },
                      { id: "heart", icon: Heart },
                    ] as const
                  ).map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      className={shape === id ? "shape selected" : "shape"}
                      onClick={() => {
                        setShape(id);
                        if (id !== "circle" && portraitSolver === "basis") {
                          setPortraitSolver("guarded");
                          setPinCount(240);
                          setPinBasis(undefined);
                          setPinLayout(undefined);
                          setPinCoordinates(undefined);
                        }
                      }}
                    >
                      <Icon size={23} />
                      {t(id)}
                    </button>
                  ))}
                </div>
                <label className="field-label" htmlFor="mode">
                  {t("mode")}
                </label>
                <select
                  id="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                >
                  <option value="dark">{t("dark")}</option>
                  <option value="light">{t("light")}</option>
                  <option value="color">{t("color")}</option>
                </select>
                <label className="field-label">
                  {t("density")} <strong>{lines}</strong>
                </label>
                <input
                  aria-label={t("density")}
                  type="range"
                  min="200"
                  max={MAX_LINES}
                  step="100"
                  value={lines}
                  onChange={(e) => setLines(+e.target.value)}
                />
                <p className="fineprint">{t("computationHint")}</p>
                <div className="preset-row">
                  {(["lighter", "balanced", "detailed"] as const).map(
                    (v, j) => (
                      <button
                        key={v}
                        className={preset === v ? "chip selected" : "chip"}
                        onClick={() => {
                          setPreset(v);
                          setLines([700, 1400, 2500][j]);
                        }}
                      >
                        {t(v)}
                      </button>
                    ),
                  )}
                </div>
              </details>
              <details className="edits">
                <summary>{t("materialSettings")}</summary>
                {[
                  {
                    key: "widthMm" as const,
                    value: widthMm,
                    set: setWidthMm,
                    min: 50,
                    max: 2000,
                    step: 10,
                  },
                  {
                    key: "heightMm" as const,
                    value: boardHeight,
                    set: setHeightMm,
                    min: 50,
                    max: 2000,
                    step: 10,
                  },
                  {
                    key: "pinCount" as const,
                    value: pinCount,
                    set: (value: number) => {
                      setPinCount(value);
                      if (portraitSolver === "basis") {
                        setPinBasis(undefined);
                        setPinLayout(undefined);
                        setPinCoordinates(undefined);
                      }
                    },
                    min: portraitSolver === "basis" ? 240 : 24,
                    max: portraitSolver === "basis" ? 320 : 240,
                    step: portraitSolver === "basis" ? 80 : 1,
                  },
                  {
                    key: "threadMm" as const,
                    value: threadMm,
                    set: setThreadMm,
                    min: 0.05,
                    max: 2,
                    step: 0.05,
                  },
                  {
                    key: "stockMeters" as const,
                    value: stockMeters,
                    set: setStockMeters,
                    min: 0,
                    max: 100000,
                    step: 1,
                  },
                ].map((r) => (
                  <label className="range-label" key={r.key}>
                    <span>{t(r.key)}</span>
                    <input
                      aria-label={t(r.key)}
                      type="number"
                      value={r.value}
                      min={r.min}
                      max={r.max}
                      step={r.step}
                      disabled={r.key === "heightMm" && shape === "circle"}
                      onChange={(e) =>
                        r.set(Math.max(r.min, Math.min(r.max, +e.target.value)))
                      }
                    />
                    {r.key === "threadMm" && (
                      <small className="fineprint">
                        {t("threadDetailHint")}
                      </small>
                    )}
                  </label>
                ))}
              </details>
              <p className="provisional">
                <span /> {t("provisional")}
              </p>
              {unreviewedPeople(portrait).length > 0 && (
                <p
                  role="status"
                  className="workflow-notice"
                  data-testid="people-review-blocked"
                >
                  {customerError(
                    `people-review/${unreviewedPeople(portrait).join(",")}`,
                    locale,
                  )}
                </p>
              )}
              <button
                className="primary full"
                data-testid="generate"
                disabled={
                  !image ||
                  busy ||
                  backgroundBusy ||
                  unreviewedPeople(portrait).length > 0
                }
                onClick={() => generate()}
              >
                {busy
                  ? `${t("generating")} ${Math.round(fraction * 100)}%`
                  : t("generate")}
                <ArrowRight size={18} />
              </button>
              {busy && (
                <>
                  <progress max="1" value={fraction} />
                  <button className="text-button" onClick={cancelGeneration}>
                    {t("cancel")}
                  </button>
                </>
              )}
            </section>
          )}
        </div>
        {(result || busy) && (
          <section className="card result-card">
            {result &&
              currentTargetHash &&
              (result!.imageHash !== currentTargetHash ||
                !currentSettingsMatch(result!)) && (
                <p
                  role="status"
                  data-testid="preserved-result-notice"
                  className="workflow-notice"
                >
                  {portraitChoiceText(locale, "stale")}
                </p>
              )}
            <div className="section-label">
              {t("step3")}
              <span className="live-dot" />
            </div>
            <div className="result-stage">
              {result ? (
                <Preview instruction={result} />
              ) : (
                <div className="empty-art">
                  <div className="thread-ring">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>{t("emptyResult")}</p>
                </div>
              )}
            </div>
            {result ? (
              <>
                <div className="stats">
                  <div>
                    <strong>
                      {result.metrics.lines.toLocaleString(locale)}
                    </strong>
                    <span>{t("lines")}</span>
                  </div>
                  <div>
                    <strong>{Math.ceil(result.metrics.estimatedMeters)}</strong>
                    <span>{t("meters")}</span>
                  </div>
                  <div>
                    <strong>
                      {Math.ceil(assemblyEffort(result, pace).estimatedMinutes)}
                    </strong>
                    <span>{t("minutes")}</span>
                  </div>
                </div>
                {result.algorithm === "density-subject/18" && (
                  <section
                    className="notice"
                    data-testid="subject-quality-review"
                    role="status"
                  >
                    <p>{subjectFitText(locale, "inspect")}</p>
                    {subjectScreens[result.sequenceHash] && (
                      <p>
                        {subjectFitText(
                          locale,
                          subjectScreens[result.sequenceHash].worstSubjectPass
                            ? "screenPass"
                            : "screenFail",
                        )}
                      </p>
                    )}
                    <ul>
                      {result.params.subject!.subjects.map((s, k) => (
                        <li key={s.id}>
                          {subjectFitText(locale, "subject")} {k + 1}
                          {subjectScreens[result.sequenceHash]
                            ? ` · ${subjectFitText(locale, subjectScreens[result.sequenceHash].subjects.find((v) => v.id === s.id)?.metricsPass ? "screenPass" : "screenFail")}`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <div className="variant-tabs">
                  {variants.map((v, j) => (
                    <button
                      key={v.instruction.id}
                      className={
                        variantState.selectedId === v.instruction.id
                          ? "chip selected"
                          : "chip"
                      }
                      onClick={() =>
                        setVariantState((s) => ({
                          ...s,
                          selectedId: v.instruction.id,
                        }))
                      }
                    >
                      {simple("variant")} {j + 1}
                    </button>
                  ))}
                </div>
                <details
                  className="edits"
                  data-testid="variant-audit"
                  data-sequence-hash={result.sequenceHash}
                >
                  <summary>{t("variantDetails")}</summary>
                  <code className="hash">
                    SHA-256 {result.sequenceHash.slice(0, 20)}…
                  </code>
                  <p className="fineprint" data-testid="assembly-effort">
                    {t("assemblyEstimateHint")} {pace} s ·{" "}
                    {assemblyEffort(result).actions} {t("assemblyActions")} ·{" "}
                    {assemblyEffort(result).starts} {t("assemblyStarts")} ·{" "}
                    {assemblyEffort(result).knots} {t("assemblyKnots")} ·{" "}
                    {assemblyEffort(result).colorChanges} {t("assemblyColors")}
                  </p>
                  <p className="fineprint">
                    {t("quality")}: {result.metrics.baselineMse.toFixed(3)} →{" "}
                    {result.metrics.reconstructionMse.toFixed(3)}.{" "}
                    {t("qualityHint")}
                  </p>
                  <p>
                    {t("requestedConnections")}:{" "}
                    {result.params.requestedLines.toLocaleString(locale)} ·{" "}
                    {result.metrics.lines.toLocaleString(locale)} {t("lines")}
                  </p>
                  <p>
                    {result.algorithm} · {result.profile.pins.length} pins ·{" "}
                    {result.profile.threadMm} mm · {result.profile.widthMm} ×{" "}
                    {result.profile.heightMm} mm
                  </p>
                  <p className="fineprint">{t("plateauHint")}</p>
                  <p className="fineprint" style={{ overflowWrap: "anywhere" }}>
                    Target: {result.imageHash}
                    <br />
                    Sequence: {result.sequenceHash}
                  </p>
                </details>
                <Supply instruction={result} locale={locale} />
                <ResultSubject instruction={result} locale={locale} />
                {result.params.resolution === 320 &&
                  ["density-resolved/12", "density-feature/16"].includes(
                    result.algorithm,
                  ) &&
                  !result.params.optimization?.head &&
                  !result.params.portrait?.people &&
                  result.params.portrait?.regions?.placement === "manual" && (
                    <>
                      <button
                        className="outline full"
                        disabled={busy}
                        data-testid="fine-feature-experiment"
                        onClick={() => generate(result, "features")}
                      >
                        {portraitChoiceText(locale, "fineFeature")}
                      </button>
                      <p className="fineprint">
                        {portraitChoiceText(locale, "fineFeatureHint")}
                      </p>
                    </>
                  )}
                {image &&
                  [
                    "continuous-guarded/6",
                    "density-multiscale/7",
                    "density-physical/8",
                    "density-anatomy/10",
                    "density-pin-basis/11",
                    "density-resolved/12",
                    "density-head/13",
                    "hair-cycles/14",
                  ].includes(result.algorithm) && (
                    <button
                      className="outline full"
                      disabled={busy}
                      onClick={() => generate(result, "simplify")}
                    >
                      {t("simplificationSolver")}
                    </button>
                  )}
                {image &&
                  ["density-physical/8", "density-anatomy/10"].includes(
                    result.algorithm,
                  ) &&
                  result.params.portrait?.regions?.placement === "manual" && (
                    <>
                      <button
                        className="outline full"
                        disabled={busy}
                        onClick={() => generate(result, "anatomy")}
                      >
                        {t("anatomySolver")}
                      </button>
                      <p className="fineprint">{t("anatomyHint")}</p>
                    </>
                  )}
                {result.params.simplification && (
                  <p className="fineprint">
                    {t("simplificationCaution")} ·{" "}
                    {result.params.simplification.connectionsSaved}{" "}
                    {t("connectionsSaved")}
                  </p>
                )}
                {image &&
                  result.algorithm !== "assembly-prune/9" &&
                  result.params.portrait?.enabled &&
                  result.params.mode !== "color" &&
                  (![
                    "density-optical/5",
                    "density-multiscale/7",
                    "density-physical/8",
                    "density-anatomy/10",
                    "density-pin-basis/11",
                    "density-resolved/12",
                    "density-head/13",
                    "hair-cycles/14",
                  ].includes(result.algorithm) ||
                    result.metrics.stoppedReason === "compute-limit") && (
                    <button
                      className="outline full"
                      disabled={busy}
                      onClick={() =>
                        generate(result, continuationStrategy(result))
                      }
                    >
                      {t(
                        [
                          "density-optical/5",
                          "density-multiscale/7",
                          "density-physical/8",
                          "density-anatomy/10",
                          "density-pin-basis/11",
                          "density-resolved/12",
                          "density-head/13",
                          "hair-cycles/14",
                        ].includes(result.algorithm)
                          ? "continueGlobal"
                          : "rerouteGlobal",
                      )}
                    </button>
                  )}
                {result.metrics.densityFit && (
                  <p className="fineprint">
                    {t("globalResult")} ·{" "}
                    {result.metrics.densityFit.routingConnections}{" "}
                    {t("routingConnections")} ·{" "}
                    {result.metrics.densityFit.removedConnections ?? 0}{" "}
                    {t("removedConnections")}. {t("refinementNotice")}
                  </p>
                )}
                {result.metrics.refinement?.reason === "compute-limit" &&
                  image && (
                    <button
                      className="outline full"
                      disabled={busy}
                      onClick={() => generate(result)}
                    >
                      {t("continueRefinement")}
                    </button>
                  )}
                {result.metrics.refinement && (
                  <p className="fineprint">{t("refinementNotice")}</p>
                )}
                {result.metrics.regions && (
                  <details className="edits">
                    <summary>{t("regionMetrics")}</summary>
                    <p className="fineprint">{t("regionHint")}</p>
                    <table>
                      <thead>
                        <tr>
                          <th>{t("faceRegion")}</th>
                          <th>MSE</th>
                          <th>{t("edgeError")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(result.metrics.regions.final).map(
                          ([key, m]) => (
                            <tr key={key}>
                              <th>
                                {result.algorithm !== "density-subject/18" &&
                                  key.startsWith("person") &&
                                  `${portraitHelp(locale, "person")} ${key.split(".")[0].slice(6)} · `}
                                {result.algorithm === "density-subject/18"
                                  ? subjectMetricLabel(
                                      locale,
                                      key,
                                      result.params.subject!,
                                    )
                                  : t(
                                      key.split(".").at(-1) as
                                        | "face"
                                        | "eyes"
                                        | "nose"
                                        | "mouth"
                                        | "outline",
                                    )}
                              </th>
                              <td>{m.mse.toFixed(4)}</td>
                              <td>{m.edgeMse.toFixed(4)}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </details>
                )}
                <details className="edits">
                  <summary>{t("projectName")}</summary>
                  <label className="field-label" htmlFor="project-name">
                    {t("projectName")}
                  </label>
                  <input
                    id="project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("defaultName")}
                    maxLength={100}
                  />
                </details>
                <button className="primary full" onClick={() => void save()}>
                  {t("save")}
                  <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <div className="result-footer">
                <Leaf size={18} />
                <p>{t("photoTips")}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
