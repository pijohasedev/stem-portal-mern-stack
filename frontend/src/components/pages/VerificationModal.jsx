import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

function VerificationModal({ isOpen, onClose, school, onSave }) {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    // Bila modal dibuka, initialize form dengan data sedia ada
    useEffect(() => {
        if (school) {
            // Jika sudah ada verifiedData, guna itu. Jika tidak, copy dari systemData (KPM)
            const source = school.verifiedData?.totalStudents > 0 ? school.verifiedData : school.systemData;

            setFormData({
                stemA: source.stemA || 0,
                stemB: source.stemB || 0,
                stemC1: source.stemC1 || 0,
                stemC2: source.stemC2 || 0,
                categoryE: source.categoryE || 0,
                categoryF: source.categoryF || 0,
                nonStem: source.nonStem || 0,
                totalStudents: source.totalStudents || 0
            });
        }
    }, [school]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: Number(value)
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        await onSave(school._id, formData);
        setLoading(false);
        onClose();
    };

    if (!school) return null;

    const system = school.systemData || {};

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Semakan Enrolmen: {school.schoolName}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{school.schoolCode} - {school.schoolType}</p>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-8 py-4">
                    {/* KIRI: DATA KPM (READ ONLY) */}
                    <div className="space-y-4 bg-slate-50 p-4 rounded border">
                        <h3 className="font-bold text-slate-700 border-b pb-2">Data Asal (KPM)</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><Label>STEM A</Label><div className="font-mono">{system.stemA}</div></div>
                            <div><Label>STEM B</Label><div className="font-mono">{system.stemB}</div></div>
                            <div><Label>STEM C1</Label><div className="font-mono">{system.stemC1}</div></div>
                            <div><Label>STEM C2</Label><div className="font-mono">{system.stemC2}</div></div>
                            <div className="col-span-2 border-t pt-2"></div>
                            <div><Label>Kategori E</Label><div className="font-mono">{system.categoryE}</div></div>
                            <div><Label>Kategori F</Label><div className="font-mono">{system.categoryF}</div></div>
                            <div className="col-span-2 border-t pt-2"></div>
                            <div><Label className="text-muted-foreground">Bukan STEM</Label><div className="font-mono">{system.nonStem}</div></div>
                            <div><Label className="font-bold">Jumlah Murid</Label><div className="font-bold text-lg">{system.totalStudents}</div></div>
                        </div>
                    </div>

                    {/* KANAN: DATA PPD (EDITABLE) */}
                    <div className="space-y-4 bg-blue-50 p-4 rounded border border-blue-200">
                        <h3 className="font-bold text-blue-800 border-b border-blue-200 pb-2">Pengesahan PPD</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><Label>STEM A</Label><Input name="stemA" type="number" value={formData.stemA} onChange={handleChange} className="bg-white" /></div>
                            <div className="space-y-1"><Label>STEM B</Label><Input name="stemB" type="number" value={formData.stemB} onChange={handleChange} className="bg-white" /></div>
                            <div className="space-y-1"><Label>STEM C1</Label><Input name="stemC1" type="number" value={formData.stemC1} onChange={handleChange} className="bg-white" /></div>
                            <div className="space-y-1"><Label>STEM C2</Label><Input name="stemC2" type="number" value={formData.stemC2} onChange={handleChange} className="bg-white" /></div>

                            <div className="col-span-2 border-t border-blue-200"></div>

                            <div className="space-y-1"><Label>Kategori E</Label><Input name="categoryE" type="number" value={formData.categoryE} onChange={handleChange} className="bg-white" /></div>
                            <div className="space-y-1"><Label>Kategori F</Label><Input name="categoryF" type="number" value={formData.categoryF} onChange={handleChange} className="bg-white" /></div>

                            <div className="col-span-2 border-t border-blue-200"></div>

                            <div className="space-y-1"><Label>Bukan STEM</Label><Input name="nonStem" type="number" value={formData.nonStem} onChange={handleChange} className="bg-white" /></div>
                            <div className="space-y-1"><Label>Jumlah Murid</Label><Input name="totalStudents" type="number" value={formData.totalStudents} onChange={handleChange} className="bg-white font-bold" /></div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Menyimpan..." : "Simpan & Sahkan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default VerificationModal;