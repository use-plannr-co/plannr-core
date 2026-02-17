import ActivityType from './ActivityType';
import Break from '../../assets/type-icons/Break.svg';
import Personal from '../../assets/type-icons/Personal.svg';
import Meeting from '../../assets/type-icons/Meeting.svg';
import Work from '../../assets/type-icons/Work.svg';
import Event from '../../assets/type-icons/Event.svg';
import Education from '../../assets/type-icons/Education.svg';
import Travel from '../../assets/type-icons/Travel.svg';
import Recreational from '../../assets/type-icons/Recreational.svg';
import Errand from '../../assets/type-icons/Errand.svg';
import Other from '../../assets/type-icons/Other.svg';

const ActivityTypeIcons = {
    [ActivityType.PERSONAL]: Personal,
    [ActivityType.MEETING]: Meeting,
    [ActivityType.WORK]: Work,
    [ActivityType.EVENT]: Event,
    [ActivityType.EDUCATION]: Education,
    [ActivityType.TRAVEL]: Travel,
    [ActivityType.RECREATIONAL]: Recreational,
    [ActivityType.ERRAND]: Errand,
    [ActivityType.OTHER]: Other,
    [ActivityType.BREAK]: Break,
};

export default ActivityTypeIcons;
