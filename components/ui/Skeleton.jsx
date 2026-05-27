/**
 * Shimmer placeholders. The `shimmer` keyframe lives in globals.css.
 *
 *   <Skeleton.Bar w="50%" />
 *   <Skeleton.Block className="aspect-square rounded-2xl" />
 */
function Bar({ w = "100%", h = "0.875rem", className = "" }) {
  return (
    <div
      className={`shimmer rounded-full ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

function Block({ className = "" }) {
  return <div className={`shimmer ${className}`} />;
}

function ProductCard() {
  return (
    <div className="bg-white rounded-[1.25rem] border border-[var(--color-hairline)] overflow-hidden">
      <Block className="aspect-[4/5]" />
      <div className="p-3.5 space-y-2.5">
        <Bar w="33%" h="0.6rem" />
        <Bar w="80%" />
        <Bar w="50%" h="1rem" />
      </div>
    </div>
  );
}

const Skeleton = { Bar, Block, ProductCard };
export default Skeleton;
