import React from 'react';
import ParagraphBlock from './blocks/ParagraphBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ChecklistGroupBlock from './blocks/ChecklistGroupBlock';
import ImageBlock from './blocks/ImageBlock';
import AudioAttachmentCard from './blocks/AudioAttachmentCard';
import DocumentEmbedCard from './blocks/DocumentEmbedCard';
import LinkReferenceChip from './blocks/LinkReferenceChip';

/**
 * Renders an ordered `blocks` array (a note's rich body content).
 *
 * Block shapes:
 *  { type: 'paragraph', text }
 *  { type: 'heading', text }
 *  { type: 'checklist', groupId }              -> items pulled from checklistItems where item.groupId === groupId
 *  { type: 'image', uri }
 *  { type: 'audio', title, dateLabel, subtitle }
 *  { type: 'document', title, thumbnailUri, snippetTitle, snippetBody }
 *  { type: 'link', prefix, label, icon }
 */
export default function NoteBlockRenderer({
  blocks = [],
  checklistItems = [],
  editable = false,
  onToggleItem,
  onChangeItemText,
  onRemoveItem,
  onAddItem,
  onOpenDocument,
  onOpenLink,
}) {
  return blocks.map((block, index) => {
    const key = block.id || `${block.type}-${index}`;

    switch (block.type) {
      case 'heading':
        return <HeadingBlock key={key} block={block} />;
      case 'paragraph':
        return <ParagraphBlock key={key} block={block} />;
      case 'checklist': {
        const items = checklistItems.filter((it) => (it.groupId || 'main') === (block.groupId || 'main'));
        return (
          <ChecklistGroupBlock
            key={key}
            items={items}
            editable={editable}
            onToggle={onToggleItem}
            onChangeText={onChangeItemText}
            onRemove={onRemoveItem}
            onAddItem={(text) => onAddItem && onAddItem(block.groupId || 'main', text)}
          />
        );
      }
      case 'image':
        return <ImageBlock key={key} block={block} />;
      case 'audio':
        return <AudioAttachmentCard key={key} block={block} />;
      case 'document':
        return <DocumentEmbedCard key={key} block={block} onOpen={() => onOpenDocument && onOpenDocument(block)} />;
      case 'link':
        return <LinkReferenceChip key={key} block={block} onPress={() => onOpenLink && onOpenLink(block)} />;
      default:
        return null;
    }
  });
}
