import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { Alert, Box, Button, Chip, CircularProgress, Divider, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import type { ProductAttributeDefinition, ProductAttributeOption } from 'shared-types';
import { AttributeDefinitionForm } from '../../components/admin/AttributeDefinitionForm';
import { ProductPreviewModal } from '../../components/admin/ProductPreviewModal';

type BuilderAttribute = Omit<ProductAttributeDefinition, 'id' | 'productId' | 'options'> & {
	id: string;
	options: BuilderOption[];
};

export type BuilderOption = Omit<ProductAttributeOption, 'id' | 'attributeDefinitionId'> & { id: string };

const ATTRIBUTE_SELECT = 'SELECT';
const PRICING_FLAT_ADD = 'FLAT_ADD_PER_OPTION';
const PRICE_FIXED_ADD = 'FIXED_ADD';

interface ProductForm {
	name: string;
	description: string;
	category: string;
	basePrice: string;
	productType: 'FIXED' | 'DYNAMIC';
}

const createOption = (): BuilderOption => ({
	id: crypto.randomUUID(),
	optionLabel: 'אפשרות חדשה',
	optionValue: 'new-option',
	priceModifier: 0,
	priceModifierType: PRICE_FIXED_ADD,
	isPerUnit: false,
	displayOrder: 0,
});

const createAttribute = (order: number): BuilderAttribute => ({
	id: crypto.randomUUID(),
	attributeName: 'מאפיין חדש',
	attributeType: ATTRIBUTE_SELECT,
	isRequired: false,
	displayOrder: order,
	pricingRule: PRICING_FLAT_ADD,
	unitPrice: null,
	minValue: null,
	maxValue: null,
	options: [createOption(), createOption()],
});

const initialProduct: ProductForm = {
	name: '',
	description: '',
	category: '',
	basePrice: '0',
	productType: 'DYNAMIC',
};

export const ProductBuilderPage = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [product, setProduct] = useState<ProductForm>(initialProduct);
	const [attributes, setAttributes] = useState<BuilderAttribute[]>([createAttribute(0)]);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(Boolean(id));
	const [notice, setNotice] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

	useEffect(() => {
		if (!id) return;
		fetch(`/api/products/${id}`)
			.then(async (response) => {
				if (!response.ok) throw new Error('לא ניתן לטעון את המוצר');
				return response.json();
			})
			.then((payload) => {
				const data = payload.data;
				setProduct({
					name: data.name ?? '',
					description: data.description ?? '',
					category: data.category ?? '',
					basePrice: String(data.basePrice ?? 0),
					productType: data.productType ?? 'DYNAMIC',
				});
				setAttributes(
					(data.attributeDefinitionEntries ?? data.attributes ?? []).map((attribute: BuilderAttribute, index: number) => ({
						...attribute,
						id: attribute.id || crypto.randomUUID(),
						displayOrder: index,
						options: attribute.options ?? (attribute as BuilderAttribute & { attributeOptionEntries?: BuilderOption[] }).attributeOptionEntries ?? [],
					}))
				);
			})
			.catch((error: Error) => setNotice({ severity: 'error', message: error.message }))
			.finally(() => setLoading(false));
	}, [id]);

	const updateAttribute = (attributeId: string, patch: Partial<BuilderAttribute>) => {
		setAttributes((current) => current.map((attribute) => attribute.id === attributeId ? { ...attribute, ...patch } : attribute));
	};

	const moveAttribute = (index: number, direction: -1 | 1) => {
		const target = index + direction;
		if (target < 0 || target >= attributes.length) return;
		setAttributes((current) => {
			const next = [...current];
			[next[index], next[target]] = [next[target], next[index]];
			return next.map((attribute, order) => ({ ...attribute, displayOrder: order }));
		});
	};

	const previewPrice = useMemo(() => {
		const optionAdds = attributes.flatMap((attribute) => attribute.options ?? []).reduce((sum, option) => sum + Number(option.priceModifier || 0), 0);
		return Number(product.basePrice || 0) + optionAdds;
	}, [attributes, product.basePrice]);

	const saveProduct = async () => {
		if (!product.name.trim() || !product.category.trim()) {
			setNotice({ severity: 'error', message: 'יש למלא שם מוצר וקטגוריה' });
			return;
		}
		setSaving(true);
		try {
			const payload = {
				...product,
				basePrice: Number(product.basePrice) || 0,
				definitions: attributes.map(({ id: attributeId, options, ...attribute }) => ({
					...attribute,
					options: options.map(({ id: optionId, ...option }) => option),
				})),
			};
			const response = await fetch(id ? `/api/admin/products/${id}` : '/api/admin/products', {
				method: id ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'שמירת המוצר נכשלה');
			setNotice({ severity: 'success', message: id ? 'המוצר עודכן בהצלחה' : 'המוצר נוצר בהצלחה' });
			if (!id && result.data?.id) navigate(`/admin/builder/${result.data.id}`, { replace: true });
		} catch (error) {
			setNotice({ severity: 'error', message: error instanceof Error ? error.message : 'שמירת המוצר נכשלה' });
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 360 }}><CircularProgress /></Box>;

	return (
		<Box sx={{ maxWidth: 1180, mx: 'auto', pb: 5 }}>
			<Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2} sx={{ mb: 3 }}>
				<Box>
					<Stack direction="row" alignItems="center" gap={1}>
						<AutoAwesomeRoundedIcon color="secondary" />
						<Typography variant="h4">בונה מוצר דינמי</Typography>
					</Stack>
					<Typography color="text.secondary" sx={{ mt: 0.5 }}>הגדר מוצר, אפשרויות וכללי תמחור במקום אחד.</Typography>
				</Box>
				<Stack direction="row" gap={1}>
					<Button variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setPreviewOpen(true)}>תצוגה מקדימה</Button>
					<Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />} onClick={saveProduct} disabled={saving}>שמירת מוצר</Button>
				</Stack>
			</Stack>

			<Paper sx={{ p: { xs: 2, md: 3 }, mb: 2.5 }}>
				<Typography variant="h6" sx={{ mb: 2 }}>פרטים בסיסיים</Typography>
				<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 2 }}>
					<TextField label="שם המוצר" required value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} />
					<TextField label="קטגוריה" required value={product.category} onChange={(event) => setProduct({ ...product, category: event.target.value })} />
					<TextField label="תיאור" multiline minRows={2} value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })} />
					<TextField label="מחיר בסיס (₪)" type="number" inputProps={{ min: 0, step: '0.01' }} value={product.basePrice} onChange={(event) => setProduct({ ...product, basePrice: event.target.value })} />
				</Box>
			</Paper>

			<Paper sx={{ p: { xs: 2, md: 3 } }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
					<Box><Typography variant="h6">מאפיינים ואפשרויות</Typography><Typography variant="body2">הסדר כאן יהיה סדר ההופעה בטופס ההזמנה.</Typography></Box>
					<Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setAttributes([...attributes, createAttribute(attributes.length)])}>הוספת מאפיין</Button>
				</Stack>
				<Stack divider={<Divider flexItem />} gap={2}>
					{attributes.map((attribute, index) => (
						<Box key={attribute.id} sx={{ pt: index ? 2 : 0 }}>
							<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
								<Chip label={`מאפיין ${index + 1}`} size="small" color="primary" variant="outlined" />
								<Stack direction="row">
									<Button aria-label="העלה מאפיין" title="העלה מאפיין" size="small" onClick={() => moveAttribute(index, -1)} disabled={index === 0}><ArrowUpwardRoundedIcon /></Button>
									<Button aria-label="הורד מאפיין" title="הורד מאפיין" size="small" onClick={() => moveAttribute(index, 1)} disabled={index === attributes.length - 1}><ArrowDownwardRoundedIcon /></Button>
									<Button color="error" size="small" onClick={() => setAttributes(attributes.filter((item) => item.id !== attribute.id))}>הסרה</Button>
								</Stack>
							</Stack>
							<AttributeDefinitionForm attribute={attribute} onChange={(patch) => updateAttribute(attribute.id, patch)} />
						</Box>
					))}
				</Stack>
			</Paper>

			<ProductPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} product={product} attributes={attributes} price={previewPrice} />
			<Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice(null)}><Alert severity={notice?.severity} onClose={() => setNotice(null)}>{notice?.message}</Alert></Snackbar>
		</Box>
	);
};

export default ProductBuilderPage;
