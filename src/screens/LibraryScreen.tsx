import type { AppScreenContext } from "../useAppController";
type ScreenContext = Pick<
  AppScreenContext,
  | "ArrowRight"
  | "CAPABILITIES"
  | "FolderOpen"
  | "Preview"
  | "Upload"
  | "applySettings"
  | "busy"
  | "continuationStrategy"
  | "deleteGenerationInput"
  | "extendSavedPortrait"
  | "generate"
  | "guideText"
  | "importInput"
  | "includeArchive"
  | "libraryFolder"
  | "libraryQuery"
  | "loaded"
  | "locale"
  | "nav"
  | "open"
  | "portraitChoiceText"
  | "projects"
  | "setError"
  | "setIncludeArchive"
  | "setLibraryFolder"
  | "setLibraryQuery"
  | "setNotice"
  | "setProjects"
  | "setView"
  | "t"
>;
export function LibraryScreen({ context }: { context: ScreenContext }) {
  const {
    ArrowRight,
    CAPABILITIES,
    FolderOpen,
    Preview,
    Upload,
    applySettings,
    busy,
    continuationStrategy,
    deleteGenerationInput,
    extendSavedPortrait,
    generate,
    guideText,
    importInput,
    includeArchive,
    libraryFolder,
    libraryQuery,
    loaded,
    locale,
    nav,
    open,
    portraitChoiceText,
    projects,
    setError,
    setIncludeArchive,
    setLibraryFolder,
    setLibraryQuery,
    setNotice,
    setProjects,
    setView,
    t,
  } = context;
  return (
    <>
      <section className="intro">
        <div>
          <div className="eyebrow">{t("local")}</div>
          <h1>{t("library")}</h1>
          <p>{t("deleteNotice")}</p>
        </div>
        <button
          className="outline"
          onClick={() => importInput.current?.click()}
        >
          <Upload size={17} />
          {t("import")}
        </button>
      </section>
      <section className="card library-filters">
        <label>
          {guideText(locale, "search")}
          <input
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
          />
        </label>
        <label>
          {guideText(locale, "folder")}
          <select
            value={libraryFolder}
            onChange={(e) => setLibraryFolder(e.target.value)}
          >
            <option value="*">{guideText(locale, "all")}</option>
            {Array.from(new Set(projects.map((p) => p.folder ?? "")))
              .sort()
              .map((folder) => (
                <option key={folder} value={folder}>
                  {folder || "—"}
                </option>
              ))}
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={includeArchive}
            onChange={(e) => setIncludeArchive(e.target.checked)}
          />
          {guideText(locale, "archive")}
        </label>
      </section>
      {!projects.length ? (
        <div className="empty-page">
          <FolderOpen size={40} />
          <p>{t("emptyLibrary")}</p>
          <button className="primary" onClick={() => nav("create")}>
            {t("create")}
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects
            .filter(
              (p) =>
                (includeArchive || !p.deletedAt) &&
                (libraryFolder === "*" || (p.folder ?? "") === libraryFolder) &&
                (p.name.toLowerCase().includes(libraryQuery.toLowerCase()) ||
                  p.instruction.sequenceHash.includes(
                    libraryQuery.toLowerCase(),
                  )),
            )
            .map((p) => (
              <article
                className={`card project-card ${p.deletedAt ? "archived" : ""}`}
                key={p.id}
              >
                <Preview instruction={p.instruction} />
                <h2>{p.name}</h2>
                <label>
                  {guideText(locale, "rename")}
                  <input
                    key={`${p.id}-name`}
                    defaultValue={p.name}
                    maxLength={100}
                    disabled={!loaded}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== p.name)
                        setProjects((ps) =>
                          ps.map((item) =>
                            item.id === p.id ? { ...item, name } : item,
                          ),
                        );
                      else e.target.value = p.name;
                    }}
                  />
                </label>
                <label>
                  {guideText(locale, "folder")}
                  <input
                    defaultValue={p.folder ?? ""}
                    maxLength={50}
                    disabled={!loaded}
                    onBlur={(e) => {
                      const folder = e.target.value.trim();
                      if (folder !== (p.folder ?? ""))
                        setProjects((ps) =>
                          ps.map((item) =>
                            item.id === p.id ? { ...item, folder } : item,
                          ),
                        );
                    }}
                  />
                </label>
                <p>
                  {p.progress.confirmed}/{p.instruction.metrics.lines} ·{" "}
                  {p.deletedAt ? t("archived") : t("confirmed")}
                </p>
                <div>
                  {!p.deletedAt &&
                    CAPABILITIES[p.instruction.algorithm].canContinue && (
                      <button
                        className="outline"
                        disabled={busy}
                        data-testid="continue-saved-calculation"
                        onClick={() => {
                          setView("create");
                          void generate(
                            p.instruction,
                            continuationStrategy(p.instruction),
                          );
                        }}
                      >
                        {portraitChoiceText(locale, "continueSaved")}
                      </button>
                    )}
                  {!p.deletedAt &&
                    p.instruction.algorithm === "density-resolved/12" &&
                    p.instruction.metrics.densityFit?.sweeps === 8 &&
                    !p.instruction.params.optimization?.convergence &&
                    !p.instruction.params.optimization?.head && (
                      <>
                        <button
                          className="outline"
                          disabled={busy}
                          data-testid="extend-saved-portrait"
                          onClick={() => void extendSavedPortrait(p)}
                        >
                          {portraitChoiceText(locale, "extendedSearch")}
                        </button>
                        <p className="fineprint">
                          {portraitChoiceText(locale, "extendedHint")}
                        </p>
                      </>
                    )}
                  <button
                    className="text-button"
                    data-testid="delete-local-calculation"
                    onClick={() => {
                      void deleteGenerationInput(
                        p.instruction.sequenceHash,
                      ).catch((e) => setError(String(e)));
                    }}
                  >
                    {portraitChoiceText(locale, "deleteInput")}
                  </button>
                  {!p.deletedAt && (
                    <button className="primary" onClick={() => open(p)}>
                      {t("open")}
                      <ArrowRight size={16} />
                    </button>
                  )}
                  {!p.deletedAt && (
                    <button
                      className="outline"
                      onClick={() => {
                        const profile = p.instruction.profile;
                        applySettings({
                          resolution: p.instruction.params.resolution,
                          shape: profile.shape,
                          mode: p.instruction.params.mode,
                          lines: p.instruction.params.requestedLines,
                          widthMm: profile.widthMm,
                          heightMm: profile.heightMm,
                          pinCount: profile.pins.length,
                          threadMm: profile.threadMm,
                          stockMeters: profile.stockMeters,
                          pinLayout: profile.pinLayout,
                          pinCoordinates: profile.pinLayout
                            ? profile.pins
                            : undefined,
                          edits: p.edits,
                          portrait: p.instruction.params.portrait,
                          anatomy: p.instruction.params.optimization?.anatomy,
                          pinBasis: p.instruction.profile.pinBasis,
                          portraitSolver: p.instruction.profile.pinBasis
                            ? "basis"
                            : p.instruction.algorithm ===
                                  "density-anatomy/10" ||
                                p.instruction.params.simplification
                                  ?.sourceAlgorithm === "density-anatomy/10"
                              ? "anatomy"
                              : p.instruction.algorithm ===
                                    "density-physical/8" ||
                                  p.instruction.params.simplification
                                    ?.sourceAlgorithm === "density-physical/8"
                                ? "physical"
                                : p.instruction.algorithm ===
                                    "density-multiscale/7"
                                  ? "multiscale"
                                  : p.instruction.algorithm ===
                                      "continuous-guarded/6"
                                    ? "guarded"
                                    : p.instruction.algorithm ===
                                        "density-optical/5"
                                      ? "global"
                                      : "continuous",
                        });
                        nav("create");
                        setNotice(t("reuseNotice"));
                      }}
                    >
                      {t("reuseSettings")}
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() =>
                      setProjects((ps) =>
                        ps.map((v) =>
                          v.id === p.id
                            ? {
                                ...v,
                                deletedAt: v.deletedAt
                                  ? undefined
                                  : new Date().toISOString(),
                              }
                            : v,
                        ),
                      )
                    }
                  >
                    {t(p.deletedAt ? "restore" : "remove")}
                  </button>
                </div>
              </article>
            ))}
        </div>
      )}
    </>
  );
}
