import { $e } from '../$e';
import { produce } from '../util/array';
import { randomInt } from '../util/math';
import { Content } from './contentControl';

function getLine(percentage: number) {
  const style = (percentage === 100) ? {} : { clipPath: `inset(0 ${100 - percentage}% 0 0)` };
  return (
    <div className='flash-container' style={style}>
      <div className='flash'/>
    </div>
  );
}

function getFullLine() {
  return getLine(100);
}

function getPartialLine() {
  return getLine(Math.random() * 60 + 20);
}

export function addPreloaderBlock(content: Content) {
  return content.addBlock({
    initElement: (
      <div className='preloader'>
        <div className='preloader-title'>
          {getPartialLine()}
        </div>
        {produce(12, () => (
          <div className='preloader-paragraph'>
            {produce(randomInt(1, 5), getFullLine)}
            {getPartialLine()}
          </div>
        ))}
      </div>
    ),
  });
}
