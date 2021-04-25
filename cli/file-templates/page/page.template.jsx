import { Suspense } from "react";

export const [[namePage]] = () => {
  return (
    <div>
      <Suspense fallback={<div>Task List Loading...</div>}>
        <div>
          [[namePage]]
        </div>
      </Suspense>
    </div>
  );
};