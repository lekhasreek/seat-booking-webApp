import React, { useRef, useEffect, useState } from 'react';
import './Minimap.css';
import FloorLayout from '../../assets/FloorMap.svg';

// We render the floorplan image then place an SVG overlay with the exact same viewBox
// containing stroked outlines of the workspace shapes (copied from FloorMap.svg).
// This ensures the borders align exactly at any display scale.
const Minimap = ({ currentWorkspace, showEntryIcon = true, navigate }) => {
  const svgViewBox = { width: 820, height: 240 };

  const svgRef = useRef(null);
  const [pin, setPin] = useState(null); // { left, top } in pixels relative to container

  useEffect(() => {
    if (!svgRef.current || !currentWorkspace) {
      setPin(null);
      return;
    }

    const svg = svgRef.current;

    const computePin = () => {
      const svgRect = svg.getBoundingClientRect();
      const nodes = svg.querySelectorAll(`[data-workspace="${currentWorkspace}"]`);
      if (!nodes || nodes.length === 0) {
        setPin(null);
        return;
      }

      let minLeft = Infinity;
      let minTop = Infinity;
      let maxRight = -Infinity;
      let maxBottom = -Infinity;

      nodes.forEach((node) => {
        const r = node.getBoundingClientRect();
        minLeft = Math.min(minLeft, r.left);
        minTop = Math.min(minTop, r.top);
        maxRight = Math.max(maxRight, r.right);
        maxBottom = Math.max(maxBottom, r.bottom);
      });

      if (minLeft === Infinity) {
        setPin(null);
        return;
      }

      const centerX = (minLeft + maxRight) / 2;
      const centerY = (minTop + maxBottom) / 2;

      setPin({ left: centerX - svgRect.left, top: centerY - svgRect.top });
    };

    computePin();
    const onResize = () => computePin();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    let ro;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(computePin);
      ro.observe(svg);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      if (ro) ro.disconnect();
    };
  }, [currentWorkspace]);

  return (
      <div 
        className="minimap-container"
      >
      <img src={FloorLayout} alt="Workspace Floor Layout" className="minimap-image" />

      {/* SVG overlay uses same viewBox as the source SVG and sits absolute over the image */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgViewBox.width} ${svgViewBox.height}`}
        preserveAspectRatio="xMinYMin meet"
        className="minimap-overlay"
        role="button"
        tabIndex={0}
        aria-label="Open full floor layout"
        onClick={(e) => {
          if (!navigate) return;
          // If a workspace shape was clicked, navigate to its section page
          const target = e.target;
          const ws = target && target.dataset && target.dataset.workspace;
          if (ws) {
            navigate(`/seat-booking/section/${ws}`);
          }
          // else: do nothing when clicking on empty/minimap background
        }}
        onKeyDown={(e) => {
          // noop at svg level — per-shape keyboard handlers are added to each overlay shape
        }}
      >
        {/* overlay shapes mapped to workspace IDs. Shapes are invisible; pin will mark current workspace */}
  <rect data-workspace="A" x="14" y="19" width="137" height="90" rx="3" className="overlay-shape" tabIndex={0} role="button" aria-label="Workspace A" onClick={() => navigate && navigate('/seat-booking/section/A')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); navigate && navigate('/seat-booking/section/A'); } }} />
  <rect data-workspace="B" x="325" y="19" width="58" height="63" rx="3" transform="rotate(90 325 19)" className="overlay-shape" tabIndex={0} role="button" aria-label="Workspace B" onClick={() => navigate && navigate('/seat-booking/section/B')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); navigate && navigate('/seat-booking/section/B'); } }} />
  <rect data-workspace="B" x="325" y="109" width="120" height="37" rx="3" transform="rotate(180 325 109)" className="overlay-shape" tabIndex={0} role="button" aria-label="Workspace B" onClick={() => navigate && navigate('/seat-booking/section/B')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); navigate && navigate('/seat-booking/section/B'); } }} />
  <rect data-workspace="D" x="755" y="18" width="91" height="58" rx="3" transform="rotate(90 755 18)" className="overlay-shape" tabIndex={0} role="button" aria-label="Workspace D" onClick={() => navigate && navigate('/seat-booking/section/D')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); navigate && navigate('/seat-booking/section/D'); } }} />
  <rect data-workspace="C" x="637" y="109" width="105" height="90" rx="3" transform="rotate(180 637 109)" className="overlay-shape" tabIndex={0} role="button" aria-label="Workspace C" onClick={() => navigate && navigate('/seat-booking/section/C')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); navigate && navigate('/seat-booking/section/C'); } }} />

  <rect data-workspace="E" x="185" y="226" width="79" height="91" rx="3" transform="rotate(180 185 226)" className="overlay-shape" tabIndex={0} role="button" aria-label="Workspace E" onClick={() => navigate && navigate('/seat-booking/section/E')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); navigate && navigate('/seat-booking/section/E'); } }} />
  <rect data-workspace="F" x="339" y="226" width="86" height="91" rx="3" transform="rotate(180 339 226)" className="overlay-shape" tabIndex={0} role="button" aria-label="Workspace F" onClick={() => navigate && navigate('/seat-booking/section/F')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); navigate && navigate('/seat-booking/section/F'); } }} />
  <path data-workspace="G" d="M552 138C552 136.343 553.343 135 555 135H684C685.657 135 687 136.343 687 138V223C687 224.657 685.657 226 684 226H619.5H555C553.343 226 552 224.657 552 223V138Z" className="overlay-shape" tabIndex={0} role="button" aria-label="Workspace G" onClick={() => navigate && navigate('/seat-booking/section/G')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); navigate && navigate('/seat-booking/section/G'); } }} />

        {/* optional: hide the floor's built-in entry icon for individual workspace pages */}
        {!showEntryIcon && (
          // cover the entry icon area with a filled rectangle using percent coords so it scales
          <rect x="46%" y="48%" width="8%" height="16%" fill="#FFFFFF" stroke="none" />
        )}

        {/* SVG overlay only - pin rendered absolutely in pixels below to avoid coordinate transform issues */}
      </svg>

      {/* absolute pixel pin positioned over the svg (works across scaling) */}
      {pin && (
        <div
          className="minimap-pin"
          style={{ left: `${pin.left}px`, top: `${pin.top}px`, position: 'absolute' }}
          aria-hidden="true"
        >
          <span className="pin-ring" />
          <span className="pin-core" />
        </div>
      )}
    </div>
  );
};

export default Minimap;
