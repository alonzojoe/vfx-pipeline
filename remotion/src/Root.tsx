import React from "react";

// Auto-discovers every project: src/projects/<name>/index.tsx
// (create one with ./scripts/new-project.sh <name>)
const ctx = require.context("./projects", true, /^\.\/[^/]+\/index\.tsx$/);

export const RemotionRoot: React.FC = () => (
  <>
    {ctx.keys().sort().map((k) => {
      const Project = ctx(k).default as React.FC;
      return <Project key={k} />;
    })}
  </>
);
