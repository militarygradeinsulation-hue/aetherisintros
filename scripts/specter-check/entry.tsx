import React from 'react';
import { createRoot } from 'react-dom/client';
import { SpecterDetectView } from '../../src/intros-ui/views/SpecterDetectView';
createRoot(document.getElementById('root')!).render(<SpecterDetectView onNavigate={page=>{document.body.dataset['destination']=page;}} onWorkspace={page=>{document.body.dataset['workspace']=page;}} onSearch={query=>{document.body.dataset['search']=query;}} member={{name:'Test Member'}}/>);
