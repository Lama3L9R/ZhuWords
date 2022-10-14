import { $e } from '../$e';
import { tagCountMap } from '../data/data';

export function tagSpan(tag: string, active: boolean) {
  const count = tagCountMap.get(tag) ?? 0;
  return (
    <div className={ 'tag-div' + (active ? ' active' : '') }>
      <span
        className={ 'tag' + ((count === 0) ? ' empty' : '') }
      >
        <span className={ 'text' + (tag.endsWith('）') ? ' parentheses-ending' : '') }>{ tag }</span>
        <span className='count'>{ count }</span>
      </span>
    </div>
  );
}